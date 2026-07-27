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
  const { data, error } = await getDb()
    .from(T)
    .select('domain,sld,nameservers,parked,expiration,last_status,in_redemption,redemption_since,available,last_http,last_checked')
    .order('last_checked', { ascending: true, nullsFirst: true })
    .limit(Math.min(limit, 1000));
  if (error) return [];
  return data || [];
}

export async function updateCandidate(domain, patch) {
  if (!isDbConfigured() || !domain) return;
  const { error } = await getDb().from(T).update(patch).eq('domain', domain);
  if (error && !/column|does not exist/i.test(error.message)) {
    // A genuinely missing column would mean a partial migration; swallow either way
    // (best-effort) but don't throw and break the cron.
  }
}

// The report: names currently IN the redemption / pending-delete window, freshest
// first. We deliberately do NOT show `available`/dropped names — those are either
// already gone (register them directly) or a gated dictionary word whose .ai was
// simply never registered; neither is what this "about to drop" report is for.
// `hideParked` is an OPTIONAL filter for the handful truly on investor-parking NS.
export async function redemptionList({ hideParked = false, includeDismissed = false, limit = 200 } = {}) {
  if (!isDbConfigured()) return [];
  function build(cols) {
    let q = getDb()
      .from(T)
      .select(cols)
      .eq('in_redemption', true)
      .order('redemption_since', { ascending: false, nullsFirst: false })
      .limit(Math.min(limit, 500));
    if (!includeDismissed) q = q.eq('dismissed', false);
    if (hideParked) q = q.eq('parked', false);
    return q;
  }
  const full = 'domain,sld,tld_count,nameservers,parked,expiration,last_status,in_redemption,redemption_since,available,last_checked';
  let { data, error } = await build(full);
  // tld_count column not migrated yet → retry without it.
  if (error && /tld_count|column/i.test(error.message)) {
    ({ data, error } = await build(full.replace('tld_count,', '')));
  }
  if (error) return [];
  return data || [];
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
  if (!isDbConfigured()) return { total: 0, in_redemption: 0, unscanned: 0 };
  const db = getDb();
  const [tot, red, uns] = await Promise.all([
    db.from(T).select('domain', { count: 'exact', head: true }),
    db.from(T).select('domain', { count: 'exact', head: true }).eq('in_redemption', true),
    db.from(T).select('domain', { count: 'exact', head: true }).is('last_checked', null),
  ]);
  return { total: tot.count || 0, in_redemption: red.count || 0, unscanned: uns.count || 0 };
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
