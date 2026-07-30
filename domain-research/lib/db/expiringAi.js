// DB layer for the Expiring .ai watchlist (domain_research_expiring_ai). Curation
// upserts candidates (never clobbering scan state); the scan reads the stalest
// candidates and writes back RDAP status; the report reads the in-redemption set.
// All best-effort + fail-open (the table may not be migrated yet).
import { getDb, isDbConfigured } from './supabase.js';

const T = 'domain_research_expiring_ai';
const META = 'domain_research_expiring_ai_meta';

export function isConfigured() {
  return isDbConfigured();
}

// Insert a freshly-curated candidate. ON CONFLICT DO NOTHING so a re-curation
// never wipes the expiration/status/redemption we've already learned — it only
// adds names we don't have yet. Returns true if it was newly inserted.
export async function insertCandidate({ domain, sld, nameservers = [], parked = false, tldCount = null, priority = 0 }) {
  if (!isDbConfigured() || !domain) return false;
  let row = { domain, sld, nameservers, parked };
  if (priority) row.priority = priority;
  if (tldCount != null) row.tld_count = tldCount;
  // Strip-and-retry any not-yet-migrated column (tld_count / priority) so curation still
  // works before the migration lands.
  for (let i = 0; i < 4; i++) {
    const { data, error } = await getDb().from(T).upsert(row, { onConflict: 'domain', ignoreDuplicates: true }).select('domain');
    if (!error) return Boolean(data && data.length);
    const m = /column "?([a-z_]+)"?|Could not find the '([a-z_]+)' column/i.exec(error.message || '');
    const col = m && (m[1] || m[2]);
    if (!col || !(col in row)) return false;
    const { [col]: _drop, ...rest } = row; row = rest;
  }
  return false;
}

// Upsert tech candidates WITH a scan priority — seeds tech terms not in the dictionary
// AND lifts an existing dictionary row's priority (so a tech-relevant word jumps the scan
// queue) WITHOUT touching its scan state (only domain/sld/priority are written). Batched,
// fail-open, strips priority if not migrated yet. Returns the number written.
export async function upsertTechCandidates(rows) {
  if (!isDbConfigured() || !rows || !rows.length) return 0;
  const CHUNK = 500;
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    let chunk = rows.slice(i, i + CHUNK).map((r) => ({ domain: r.domain, sld: r.sld, priority: r.priority || 2 }));
    for (let t = 0; t < 3; t++) {
      const { error } = await getDb().from(T).upsert(chunk, { onConflict: 'domain' });
      if (!error) { written += chunk.length; break; }
      if (/priority|column/i.test(error.message)) { chunk = chunk.map(({ priority, ...x }) => x); continue; }
      break;   // unknown error → skip this chunk (best-effort)
    }
  }
  return written;
}

// Cross-reference the Namecheap auction feed against the names WE'RE ALREADY TRACKING as
// about-to-drop (redemption / pending delete) — annotate the matches with the auction
// price/end/url, stamp namecheap_listed_at first-seen. Does NOT seed new candidates (the
// watchlist stays dictionary/tech-driven; NC is just a signal on the surfaced set).
// The surfaced set is small (~dozens), so per-row updates are fine. Fail-open + strip-retry.
export async function syncNamecheap(entries) {
  if (!isDbConfigured() || !entries || !entries.length) return { surfaced: 0, matched: 0, newlyListed: 0 };
  const map = new Map(entries.map((e) => [e.domain, e]));
  const { data, error } = await getDb().from(T)
    .select('domain,namecheap_listed_at')
    .or('in_redemption.eq.true,in_pending_delete.eq.true');
  if (error) return { surfaced: 0, matched: 0, newlyListed: 0, error: error.message };
  const surfaced = data || [];
  const nowIso = new Date().toISOString();
  let matched = 0, newlyListed = 0;
  for (const r of surfaced) {
    const nc = map.get(r.domain);
    if (!nc) continue;
    matched++;
    let payload = { namecheap_price: nc.price != null ? nc.price : null, namecheap_end: nc.end || null, namecheap_url: nc.url || null };
    if (!r.namecheap_listed_at) { payload.namecheap_listed_at = nowIso; newlyListed++; }
    for (let i = 0; i < 4; i++) {
      const { error: uerr } = await getDb().from(T).update(payload).eq('domain', r.domain);
      if (!uerr) break;
      const m = /column "?([a-z_]+)"?|Could not find the '([a-z_]+)' column/i.exec(uerr.message || '');
      const col = m && (m[1] || m[2]);
      if (!col || !(col in payload)) break;
      const { [col]: _d, ...rest } = payload; payload = rest;
      if (!Object.keys(payload).length) break;
    }
  }
  return { surfaced: surfaced.length, matched, newlyListed };
}

// Already-SURFACED names (in redemption / pending delete), stalest-checked first. These
// must be re-scanned on their adaptive cadence (pending delete → every minute) so a name
// advances redemption→pending→dropped on time — otherwise the huge first-scan backlog
// (nulls-first ordering below) starves them for days. The caller isDue-filters + scans
// these BEFORE the backlog. Small set (~the surfaced count), fail-open.
export async function dueSurfacedCandidates(limit = 400) {
  if (!isDbConfigured()) return [];
  const base = 'domain,sld,nameservers,parked,expiration,last_status,in_redemption,redemption_since,available,last_http,last_checked';
  const extra = ',in_pending_delete,pending_delete_since,dropped_at,demand_ok,tld_count';
  function build(cols) {
    return getDb().from(T).select(cols)
      .or('in_redemption.eq.true,in_pending_delete.eq.true')
      .order('last_checked', { ascending: true, nullsFirst: true })
      .limit(Math.min(limit, 1000));
  }
  let { data, error } = await build(base + extra);
  // lifecycle columns (0014) not migrated → the flags don't exist yet; nothing to prioritize.
  if (error) return [];
  return data || [];
}

// The stalest candidates first (never-checked → nulls first), so the scan's
// adaptive cadence gets to learn each name's expiration and then taper. The
// caller isDue-filters the returned slice.
export async function staleCandidates(limit = 300) {
  if (!isDbConfigured()) return [];
  const base = 'domain,sld,nameservers,parked,expiration,last_status,in_redemption,redemption_since,available,last_http,last_checked';
  const extra = ',in_pending_delete,pending_delete_since,dropped_at,demand_ok,tld_count';
  // Never-scanned first (nulls), and within those the higher-priority (tech-relevant)
  // names first, so they get RDAP-checked ahead of plain dictionary words.
  function build(cols, withPriority) {
    let q = getDb().from(T).select(cols + (withPriority ? ',priority' : ''))
      .order('last_checked', { ascending: true, nullsFirst: true });
    if (withPriority) q = q.order('priority', { ascending: false });
    return q.limit(Math.min(limit, 1000));
  }
  let { data, error } = await build(base + extra, true);
  // priority column (0015) not migrated → drop the priority select+order.
  if (error && /priority/i.test(error.message)) ({ data, error } = await build(base + extra, false));
  // lifecycle columns (0014) not migrated → fall back to the base set too.
  if (error && /column|in_pending_delete|pending_delete_since|dropped_at|demand_ok|tld_count/i.test(error.message)) {
    ({ data, error } = await build(base, false));
  }
  if (error) return [];
  return data || [];
}

export async function updateCandidate(domain, patch) {
  if (!isDbConfigured() || !domain) return;
  // Strip-and-retry on a not-yet-migrated column (e.g. registrar) so the rest of the
  // update (last_checked/status/…) still lands — otherwise the candidate never gets
  // marked scanned and the cron re-does it forever.
  let payload = { ...patch };
  for (let i = 0; i < 4; i++) {
    const { error } = await getDb().from(T).update(payload).eq('domain', domain);
    if (!error) return;
    const m = /column "?([a-z_]+)"?|Could not find the '([a-z_]+)' column/i.exec(error.message || '');
    const col = m && (m[1] || m[2]);
    if (!col || !(col in payload)) return;   // unknown error → best-effort swallow
    const { [col]: _drop, ...rest } = payload;
    payload = rest;
  }
}

// The report: names currently IN the redemption / pending-delete window, freshest
// first. We deliberately do NOT show `available`/dropped names — those are either
// already gone (register them directly) or a gated dictionary word whose .ai was
// simply never registered; neither is what this "about to drop" report is for.
// `hideParked` is an OPTIONAL filter for the handful truly on investor-parking NS.
export async function redemptionList(opts = {}) {
  return windowList('redemption', opts);
}
// The pending-delete window — names that moved OUT of redemption into the final
// ~4–6-day countdown to the drop. Same shape as redemptionList, ordered by when they
// entered pending delete (freshest first).
export async function pendingDeleteList(opts = {}) {
  return windowList('pending', opts);
}
async function windowList(which, { hideParked = false, includeDismissed = false, limit = 200 } = {}) {
  if (!isDbConfigured()) return [];
  const flag = which === 'pending' ? 'in_pending_delete' : 'in_redemption';
  const orderCol = which === 'pending' ? 'pending_delete_since' : 'redemption_since';
  function build(cols) {
    let q = getDb()
      .from(T)
      .select(cols)
      .eq(flag, true)
      .order(orderCol, { ascending: false, nullsFirst: false })
      .limit(Math.min(limit, 500));
    if (!includeDismissed) q = q.eq('dismissed', false);
    if (hideParked) q = q.eq('parked', false);
    return q;
  }
  const full = 'domain,sld,tld_count,registrar,nameservers,parked,expiration,last_status,in_redemption,in_pending_delete,redemption_since,pending_delete_since,available,last_checked,namecheap_listed_at,namecheap_price,namecheap_url,registrant_email,registrant_phone,registrant_name,registrant_private,rr';
  const stripReg = (c) => c.replace(',registrant_email', '').replace(',registrant_phone', '').replace(',registrant_name', '').replace(',registrant_private', '').replace(',rr', '');
  let { data, error } = await build(full);
  // Migration 0018 (rr column) not run yet → drop it, keep registrant columns.
  if (error && /'rr'|\brr\b/i.test(error.message) && !/registrant/i.test(error.message)) {
    ({ data, error } = await build(full.replace(',rr', '')));
  }
  // Migration 0017 (registrant columns) not run yet → drop those (stripReg also drops rr).
  if (error && /registrant|'rr'/i.test(error.message)) {
    ({ data, error } = await build(stripReg(full)));
  }
  // Migration 0016 (namecheap columns) not run yet → drop those.
  if (error && /namecheap/i.test(error.message)) {
    ({ data, error } = await build(stripReg(full).replace('namecheap_listed_at,', '').replace('namecheap_price,', '').replace(',namecheap_url', '')));
  }
  // Migration 0014 (pending-delete columns) not run yet → drop ONLY those, keeping the
  // already-migrated tld_count/registrar so the redemption view doesn't regress.
  if (error && /in_pending_delete|pending_delete_since/i.test(error.message)) {
    ({ data, error } = await build(stripReg(full).replace('in_pending_delete,', '').replace('pending_delete_since,', '')
      .replace('namecheap_listed_at,', '').replace('namecheap_price,', '').replace(',namecheap_url', '')));
  }
  // Very old schema (no tld_count/registrar either) → drop those too.
  if (error && /tld_count|registrar|column/i.test(error.message)) {
    ({ data, error } = await build(stripReg(full)
      .replace('tld_count,', '').replace('registrar,', '')
      .replace('in_pending_delete,', '').replace('pending_delete_since,', '')
      .replace('namecheap_listed_at,', '').replace('namecheap_price,', '').replace(',namecheap_url', '')));
  }
  if (error) return [];
  return data || [];
}

// Lifecycle DURATION metrics for the Metrics tab — how long names sit in each phase,
// aggregated by registrar. The tracked set (names that have entered the pipeline) is
// small, so we pull the rows and aggregate in JS (no RPC/migration needed). Fail-open.
export async function lifecycleMetrics({ limit = 5000 } = {}) {
  if (!isDbConfigured()) return { rows: [], overall: null };
  function build(cols) {
    // Only true lifecycle rows (names we've actually seen in redemption/pending) — not
    // every row that merely carries a Namecheap annotation.
    return getDb().from(T).select(cols)
      .or('redemption_since.not.is.null,pending_delete_since.not.is.null')
      .limit(limit);
  }
  let { data, error } = await build('registrar,expiration,redemption_since,pending_delete_since,dropped_at,in_redemption,in_pending_delete,namecheap_listed_at');
  // namecheap columns (0016) not migrated yet → retry without them.
  if (error && /namecheap/i.test(error.message)) {
    ({ data, error } = await build('registrar,expiration,redemption_since,pending_delete_since,dropped_at,in_redemption,in_pending_delete'));
  }
  if (error) return { rows: [], overall: null };
  const DAY = 86_400_000;
  const days = (a, b) => {
    const ta = Date.parse(a), tb = Date.parse(b);
    if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
    const d = (tb - ta) / DAY;
    return d >= 0 ? d : null;                       // guard clock/observation order
  };
  const byReg = new Map();
  const bucket = (key) => {
    if (!byReg.has(key)) byReg.set(key, { registrar: key, e2r: [], r2p: [], p2d: [], p2nc: [], on_nc: 0, in_redemption: 0, in_pending_delete: 0 });
    return byReg.get(key);
  };
  for (const r of data || []) {
    const g = bucket(r.registrar || 'Unknown');
    if (r.in_redemption) g.in_redemption++;
    if (r.in_pending_delete) g.in_pending_delete++;
    if (r.namecheap_listed_at) g.on_nc++;
    // Expiration → Redemption: the registered expiry date to first-seen in redemption (the
    // auto-renew grace before it lapses into redemption). Positive-only via the days() guard.
    if (r.expiration && r.redemption_since) { const d = days(r.expiration, r.redemption_since); if (d != null) g.e2r.push(d); }
    if (r.redemption_since && r.pending_delete_since) { const d = days(r.redemption_since, r.pending_delete_since); if (d != null) g.r2p.push(d); }
    if (r.pending_delete_since && r.dropped_at) { const d = days(r.pending_delete_since, r.dropped_at); if (d != null) g.p2d.push(d); }
    // Pending → Namecheap: only positive (a name can hit NC BEFORE pending — those don't
    // count toward the "how long after pending does it reach NC" average).
    if (r.pending_delete_since && r.namecheap_listed_at) { const d = days(r.pending_delete_since, r.namecheap_listed_at); if (d != null) g.p2nc.push(d); }
  }
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const rows = [...byReg.values()].map((g) => ({
    registrar: g.registrar,
    in_redemption: g.in_redemption,
    in_pending_delete: g.in_pending_delete,
    on_namecheap: g.on_nc,
    n_exp_to_redemption: g.e2r.length,
    avg_exp_to_redemption: avg(g.e2r),
    n_red_to_pending: g.r2p.length,
    avg_red_to_pending: avg(g.r2p),
    n_pending_to_drop: g.p2d.length,
    avg_pending_to_drop: avg(g.p2d),
    n_pending_to_namecheap: g.p2nc.length,
    avg_pending_to_namecheap: avg(g.p2nc),
  })).sort((a, b) => (b.n_red_to_pending + b.n_pending_to_drop + b.on_namecheap) - (a.n_red_to_pending + a.n_pending_to_drop + a.on_namecheap) || String(a.registrar).localeCompare(String(b.registrar)));
  const overall = {
    on_namecheap: rows.reduce((s, r) => s + r.on_namecheap, 0),
    n_exp_to_redemption: rows.reduce((s, r) => s + r.n_exp_to_redemption, 0),
    avg_exp_to_redemption: avgWeighted(rows, 'avg_exp_to_redemption', 'n_exp_to_redemption'),
    n_red_to_pending: rows.reduce((s, r) => s + r.n_red_to_pending, 0),
    avg_red_to_pending: avgWeighted(rows, 'avg_red_to_pending', 'n_red_to_pending'),
    n_pending_to_drop: rows.reduce((s, r) => s + r.n_pending_to_drop, 0),
    avg_pending_to_drop: avgWeighted(rows, 'avg_pending_to_drop', 'n_pending_to_drop'),
    n_pending_to_namecheap: rows.reduce((s, r) => s + r.n_pending_to_namecheap, 0),
    avg_pending_to_namecheap: avgWeighted(rows, 'avg_pending_to_namecheap', 'n_pending_to_namecheap'),
  };
  return { rows, overall };
}
function avgWeighted(rows, valKey, nKey) {
  let num = 0, den = 0;
  for (const r of rows) { if (r[valKey] != null && r[nKey]) { num += r[valKey] * r[nKey]; den += r[nKey]; } }
  return den ? num / den : null;
}

// A single candidate row by domain (for the on-demand RocketReach enrich action).
export async function getCandidate(domain) {
  if (!isDbConfigured() || !domain) return null;
  const cols = 'domain,sld,registrant_email,registrant_phone,registrant_name,registrant_private,rr';
  let { data, error } = await getDb().from(T).select(cols).eq('domain', domain).maybeSingle();
  if (error && /'rr'|\brr\b/i.test(error.message)) {
    ({ data, error } = await getDb().from(T).select(cols.replace(',rr', '')).eq('domain', domain).maybeSingle());
  }
  if (error) return null;
  return data || null;
}

export async function setDismissed(domain, dismissed = true) {
  if (!isDbConfigured() || !domain) return;
  await getDb().from(T).update({ dismissed }).eq('domain', domain);
}

// The digest cron: names that are currently in redemption (non-parked, not
// dismissed) and haven't been emailed yet — so the ~6×/day email only carries the
// NEW ones as they cross in, never re-sending the same names. Freshest first.
export async function unemailedRedemption({ limit = 200 } = {}) {
  if (!isDbConfigured()) return [];
  const { data, error } = await getDb()
    .from(T)
    .select('domain,sld,expiration,last_status,redemption_since,available')
    .eq('in_redemption', true)
    .eq('dismissed', false)
    .is('emailed_at', null)
    .order('redemption_since', { ascending: false, nullsFirst: false })
    .limit(Math.min(limit, 500));
  if (error) return [];
  return data || [];
}

// Stamp a batch of domains as emailed (chunked .in()).
export async function markEmailed(domains) {
  if (!isDbConfigured() || !domains || !domains.length) return;
  const nowIso = new Date().toISOString();
  const CHUNK = 200;
  for (let i = 0; i < domains.length; i += CHUNK) {
    const chunk = domains.slice(i, i + CHUNK);
    await getDb().from(T).update({ emailed_at: nowIso }).in('domain', chunk);
  }
}

// Coverage counts for the report header.
export async function stats() {
  if (!isDbConfigured()) return { total: 0, in_redemption: 0, in_pending_delete: 0, unscanned: 0 };
  const db = getDb();
  const safeCount = async (q) => { const r = await q; return r.error ? 0 : (r.count || 0); };   // missing column → 0
  const [tot, red, pd, nc, uns] = await Promise.all([
    db.from(T).select('domain', { count: 'exact', head: true }),
    db.from(T).select('domain', { count: 'exact', head: true }).eq('in_redemption', true),
    safeCount(db.from(T).select('domain', { count: 'exact', head: true }).eq('in_pending_delete', true)),
    safeCount(db.from(T).select('domain', { count: 'exact', head: true }).not('namecheap_listed_at', 'is', null).or('in_redemption.eq.true,in_pending_delete.eq.true')),
    db.from(T).select('domain', { count: 'exact', head: true }).is('last_checked', null),
  ]);
  return { total: tot.count || 0, in_redemption: red.count || 0, in_pending_delete: pd, on_namecheap: nc, unscanned: uns.count || 0 };
}

// ── Curation cursor (keyset over the .ai zone) ──────────────────────────────
export async function getCursor(k = 'ai_curation_cursor') {
  if (!isDbConfigured()) return '';
  const { data, error } = await getDb().from(META).select('v').eq('k', k).maybeSingle();
  if (error || !data) return '';
  return data.v || '';
}
export async function setCursor(v, k = 'ai_curation_cursor') {
  if (!isDbConfigured()) return;
  await getDb().from(META).upsert({ k, v: String(v || ''), updated_at: new Date().toISOString() }, { onConflict: 'k' });
}
