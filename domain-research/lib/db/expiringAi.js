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
export async function insertCandidate({ domain, sld, nameservers = [], parked = false, tldCount = null }) {
  if (!isDbConfigured() || !domain) return false;
  const row = { domain, sld, nameservers, parked };
  if (tldCount != null) row.tld_count = tldCount;
  async function ins(r) {
    return getDb().from(T).upsert(r, { onConflict: 'domain', ignoreDuplicates: true }).select('domain');
  }
  let { data, error } = await ins(row);
  // tld_count column not migrated yet → strip it and retry so curation still works.
  if (error && /tld_count|column/i.test(error.message) && 'tld_count' in row) {
    const { tld_count, ...rest } = row;
    ({ data, error } = await ins(rest));
  }
  if (error) return false;
  return Boolean(data && data.length);
}

// The stalest candidates first (never-checked → nulls first), so the scan's
// adaptive cadence gets to learn each name's expiration and then taper. The
// caller isDue-filters the returned slice.
export async function staleCandidates(limit = 300) {
  if (!isDbConfigured()) return [];
  const base = 'domain,sld,nameservers,parked,expiration,last_status,in_redemption,redemption_since,available,last_http,last_checked';
  const extra = ',in_pending_delete,pending_delete_since,dropped_at,demand_ok,tld_count';
  function build(cols) {
    return getDb().from(T).select(cols)
      .order('last_checked', { ascending: true, nullsFirst: true })
      .limit(Math.min(limit, 1000));
  }
  let { data, error } = await build(base + extra);
  // New lifecycle columns not migrated yet → fall back to the base set so the scan
  // still runs (pending-delete tracking just no-ops until the migration lands).
  if (error && /column|in_pending_delete|pending_delete_since|dropped_at|demand_ok|tld_count/i.test(error.message)) {
    ({ data, error } = await build(base));
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
  const full = 'domain,sld,tld_count,registrar,nameservers,parked,expiration,last_status,in_redemption,in_pending_delete,redemption_since,pending_delete_since,available,last_checked';
  let { data, error } = await build(full);
  // Migration 0014 (pending-delete columns) not run yet → drop ONLY those, keeping the
  // already-migrated tld_count/registrar so the redemption view doesn't regress.
  if (error && /in_pending_delete|pending_delete_since/i.test(error.message)) {
    ({ data, error } = await build(full.replace('in_pending_delete,', '').replace('pending_delete_since,', '')));
  }
  // Very old schema (no tld_count/registrar either) → drop those too.
  if (error && /tld_count|registrar|column/i.test(error.message)) {
    ({ data, error } = await build(full
      .replace('tld_count,', '').replace('registrar,', '')
      .replace('in_pending_delete,', '').replace('pending_delete_since,', '')));
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
    return getDb().from(T).select(cols)
      .or('redemption_since.not.is.null,pending_delete_since.not.is.null')
      .limit(limit);
  }
  let { data, error } = await build('registrar,redemption_since,pending_delete_since,dropped_at,in_redemption,in_pending_delete');
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
    if (!byReg.has(key)) byReg.set(key, { registrar: key, r2p: [], p2d: [], in_redemption: 0, in_pending_delete: 0 });
    return byReg.get(key);
  };
  for (const r of data || []) {
    const g = bucket(r.registrar || 'Unknown');
    if (r.in_redemption) g.in_redemption++;
    if (r.in_pending_delete) g.in_pending_delete++;
    if (r.redemption_since && r.pending_delete_since) { const d = days(r.redemption_since, r.pending_delete_since); if (d != null) g.r2p.push(d); }
    if (r.pending_delete_since && r.dropped_at) { const d = days(r.pending_delete_since, r.dropped_at); if (d != null) g.p2d.push(d); }
  }
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const rows = [...byReg.values()].map((g) => ({
    registrar: g.registrar,
    in_redemption: g.in_redemption,
    in_pending_delete: g.in_pending_delete,
    n_red_to_pending: g.r2p.length,
    avg_red_to_pending: avg(g.r2p),
    n_pending_to_drop: g.p2d.length,
    avg_pending_to_drop: avg(g.p2d),
  })).sort((a, b) => (b.n_red_to_pending + b.n_pending_to_drop) - (a.n_red_to_pending + a.n_pending_to_drop) || String(a.registrar).localeCompare(String(b.registrar)));
  const overall = {
    n_red_to_pending: rows.reduce((s, r) => s + r.n_red_to_pending, 0),
    avg_red_to_pending: avgWeighted(rows, 'avg_red_to_pending', 'n_red_to_pending'),
    n_pending_to_drop: rows.reduce((s, r) => s + r.n_pending_to_drop, 0),
    avg_pending_to_drop: avgWeighted(rows, 'avg_pending_to_drop', 'n_pending_to_drop'),
  };
  return { rows, overall };
}
function avgWeighted(rows, valKey, nKey) {
  let num = 0, den = 0;
  for (const r of rows) { if (r[valKey] != null && r[nKey]) { num += r[valKey] * r[nKey]; den += r[nKey]; } }
  return den ? num / den : null;
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
  const countPd = async () => {
    const r = await db.from(T).select('domain', { count: 'exact', head: true }).eq('in_pending_delete', true);
    return r.error ? 0 : (r.count || 0);   // column not migrated → 0
  };
  const [tot, red, pd, uns] = await Promise.all([
    db.from(T).select('domain', { count: 'exact', head: true }),
    db.from(T).select('domain', { count: 'exact', head: true }).eq('in_redemption', true),
    countPd(),
    db.from(T).select('domain', { count: 'exact', head: true }).is('last_checked', null),
  ]);
  return { total: tot.count || 0, in_redemption: red.count || 0, in_pending_delete: pd, unscanned: uns.count || 0 };
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
