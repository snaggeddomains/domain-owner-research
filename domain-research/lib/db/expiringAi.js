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
export async function insertCandidate({ domain, sld, nameservers = [], parked = false }) {
  if (!isDbConfigured() || !domain) return false;
  const { data, error } = await getDb()
    .from(T)
    .upsert({ domain, sld, nameservers, parked }, { onConflict: 'domain', ignoreDuplicates: true })
    .select('domain');
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

// The report: names currently in the redemption/delete window (or just dropped),
// freshest first, excluding dismissed + parked (investor-held) by default.
export async function redemptionList({ includeParked = false, includeDismissed = false, limit = 200 } = {}) {
  if (!isDbConfigured()) return [];
  let q = getDb()
    .from(T)
    .select('domain,sld,nameservers,parked,expiration,last_status,in_redemption,redemption_since,available,last_checked')
    .or('in_redemption.eq.true,available.eq.true')
    .order('redemption_since', { ascending: false, nullsFirst: false })
    .limit(Math.min(limit, 500));
  if (!includeDismissed) q = q.eq('dismissed', false);
  if (!includeParked) q = q.eq('parked', false);
  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

export async function setDismissed(domain, dismissed = true) {
  if (!isDbConfigured() || !domain) return;
  await getDb().from(T).update({ dismissed }).eq('domain', domain);
}

// Coverage counts for the report header.
export async function stats() {
  if (!isDbConfigured()) return { total: 0, in_redemption: 0, unscanned: 0 };
  const db = getDb();
  const [tot, red, uns] = await Promise.all([
    db.from(T).select('domain', { count: 'exact', head: true }),
    db.from(T).select('domain', { count: 'exact', head: true }).eq('in_redemption', true).eq('parked', false),
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
