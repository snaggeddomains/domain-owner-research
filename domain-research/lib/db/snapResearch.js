// SNAP Research persistence (research project). The curation seeds <word>.com rows from the
// dictionary; the scan enriches the stalest / most-common unscanned rows with abandonment +
// value clues and scores them. All reads/writes go through here.

import { getDb, isDbConfigured } from './supabase.js';

const T = 'domain_research_snap_research';
const META = 'domain_research_snap_research_meta';

export function snapResearchConfigured() {
  return isDbConfigured();
}

// Seed candidate rows (curation). Upsert ignore-duplicates so a re-seed never clobbers scan
// state. Returns the count of genuinely-new rows.
export async function insertSnapCandidates(rows) {
  if (!isDbConfigured() || !rows.length) return 0;
  let kept = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => ({
      domain: r.domain, word: r.word, zipf: r.zipf ?? null, wlen: r.wlen ?? null,
    }));
    const { data, error } = await getDb().from(T).upsert(chunk, { onConflict: 'domain', ignoreDuplicates: true }).select('domain');
    if (!error && data) kept += data.length;
  }
  return kept;
}

// The scan slice: never-checked first, and among those the most-common words (highest zipf)
// first; then the stalest already-checked. Bounded by `limit`.
export async function dueForScan(limit = 30) {
  if (!isDbConfigured()) return [];
  const { data, error } = await getDb().from(T)
    .select('domain,word,zipf,wlen,tld_count')
    .order('last_checked', { ascending: true, nullsFirst: true })
    .order('zipf', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function updateSnapRow(domain, patch) {
  if (!isDbConfigured()) return;
  await getDb().from(T).update(patch).eq('domain', domain);
}

// The report: candidates (high value AND high abandonment), best score first. `all` includes
// non-candidates (for inspection); `includeDismissed` includes dismissed rows.
export async function snapCandidateList({ limit = 300, all = false, includeDismissed = false } = {}) {
  if (!isDbConfigured()) return [];
  let q = getDb().from(T).select('*');
  if (!all) q = q.eq('candidate', true);
  if (!includeDismissed) q = q.eq('dismissed', false);
  const { data, error } = await q.order('score', { ascending: false, nullsFirst: false }).limit(limit);
  if (error) return [];
  return data || [];
}

export async function getSnapRow(domain) {
  if (!isDbConfigured()) return null;
  const { data } = await getDb().from(T).select('*').eq('domain', domain).maybeSingle();
  return data || null;
}

export async function setSnapDismissed(domain, dismissed) {
  if (!isDbConfigured()) return;
  await getDb().from(T).update({ dismissed: !!dismissed }).eq('domain', domain);
}

export async function markSnapAddedDeal(domain) {
  if (!isDbConfigured()) return;
  await getDb().from(T).update({ added_deal: true }).eq('domain', domain);
}

export async function snapStats() {
  if (!isDbConfigured()) return { total: 0, scanned: 0, candidates: 0 };
  const [total, scanned, candidates] = await Promise.all([
    getDb().from(T).select('domain', { count: 'exact', head: true }),
    getDb().from(T).select('domain', { count: 'exact', head: true }).not('last_checked', 'is', null),
    getDb().from(T).select('domain', { count: 'exact', head: true }).eq('candidate', true).eq('dismissed', false),
  ]);
  return { total: total.count || 0, scanned: scanned.count || 0, candidates: candidates.count || 0 };
}

export async function getCursor(k = 'curation_cursor') {
  if (!isDbConfigured()) return '';
  const { data } = await getDb().from(META).select('v').eq('k', k).maybeSingle();
  return data?.v || '';
}
export async function setCursor(v, k = 'curation_cursor') {
  if (!isDbConfigured()) return;
  await getDb().from(META).upsert({ k, v: String(v || ''), updated_at: new Date().toISOString() }, { onConflict: 'k' });
}
