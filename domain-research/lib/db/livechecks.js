import { getDb } from './supabase.js';

// 72h cache of the naming "is it actually for sale?" live classification, keyed
// by domain, so repeated searches don't re-fetch the same landing pages.
// All reads/writes are guarded — a missing table (pre-migration) degrades to
// "no cache" rather than breaking verification.
const T = 'domain_research_live_checks';
const TTL_MS = 72 * 60 * 60 * 1000; // 72h — for-sale vs in-use rarely flips that fast

// Return { domain: status } for rows checked within the TTL.
export async function getFreshLiveChecks(domains) {
  const list = [...new Set((domains || []).map((d) => String(d || '').toLowerCase().trim()).filter(Boolean))];
  if (!list.length) return {};
  try {
    const { data, error } = await getDb()
      .from(T).select('domain,status,checked_at').in('domain', list);
    if (error) throw error;
    const out = {};
    const cutoff = Date.now() - TTL_MS;
    for (const r of data || []) {
      if (r.checked_at && Date.parse(r.checked_at) >= cutoff) out[r.domain] = r.status;
    }
    return out;
  } catch (e) {
    console.error('getFreshLiveChecks (continuing without cache):', e.message || e);
    return {};
  }
}

// Upsert freshly-classified rows. pairs = [{ domain, status }].
export async function saveLiveChecks(pairs) {
  const rows = (pairs || [])
    .map((p) => ({ domain: String(p.domain || '').toLowerCase().trim(), status: p.status, checked_at: new Date().toISOString() }))
    .filter((r) => r.domain && r.status);
  if (!rows.length) return;
  try {
    await getDb().from(T).upsert(rows, { onConflict: 'domain' });
  } catch (e) {
    console.error('saveLiveChecks (non-fatal):', e.message || e);
  }
}
