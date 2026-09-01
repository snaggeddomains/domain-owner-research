import { getDb } from './supabase.js';

// 72h cache of the naming "is it actually for sale?" live pass, keyed by domain, so
// repeated searches don't re-fetch the same landing pages. Stores the live-site
// CLASSIFICATION (status) AND the live marketplace ASKING PRICE (live_price/currency)
// so a corpus-vs-live price mismatch can be flagged without re-fetching.
// All reads/writes are guarded — a missing table OR the newer price columns
// (pre-migration) degrade to "no cache" / status-only rather than breaking verify.
const T = 'domain_research_live_checks';
const TTL_MS = 72 * 60 * 60 * 1000; // 72h — for-sale vs in-use rarely flips that fast

// Return { domain: { status, live_price, live_currency } } for rows within the TTL.
export async function getFreshLiveChecks(domains) {
  const list = [...new Set((domains || []).map((d) => String(d || '').toLowerCase().trim()).filter(Boolean))];
  if (!list.length) return {};
  const parse = (rows) => {
    const out = {};
    const cutoff = Date.now() - TTL_MS;
    for (const r of rows || []) {
      if (r.checked_at && Date.parse(r.checked_at) >= cutoff) {
        out[r.domain] = {
          status: r.status,
          live_price: r.live_price != null ? Number(r.live_price) : null,
          live_currency: r.live_currency || null,
        };
      }
    }
    return out;
  };
  try {
    const { data, error } = await getDb()
      .from(T).select('domain,status,checked_at,live_price,live_currency').in('domain', list);
    if (error) throw error;
    return parse(data);
  } catch (e) {
    // Pre-migration: the price columns don't exist → retry status-only.
    if (/live_price|live_currency|column/i.test(e.message || '')) {
      try {
        const { data, error } = await getDb().from(T).select('domain,status,checked_at').in('domain', list);
        if (!error) return parse(data);
      } catch { /* fall through */ }
    }
    console.error('getFreshLiveChecks (continuing without cache):', e.message || e);
    return {};
  }
}

// Upsert freshly-verified rows. pairs = [{ domain, status, live_price?, live_currency? }].
export async function saveLiveChecks(pairs) {
  const rows = (pairs || [])
    .map((p) => ({
      domain: String(p.domain || '').toLowerCase().trim(),
      status: p.status,
      live_price: p.live_price != null ? Number(p.live_price) : null,
      live_currency: p.live_currency || null,
      checked_at: new Date().toISOString(),
    }))
    .filter((r) => r.domain && r.status);
  if (!rows.length) return;
  try {
    await getDb().from(T).upsert(rows, { onConflict: 'domain' });
  } catch (e) {
    // Pre-migration: strip the price columns and retry status-only.
    if (/live_price|live_currency|column/i.test(e.message || '')) {
      try {
        await getDb().from(T).upsert(
          rows.map(({ live_price, live_currency, ...rest }) => rest),
          { onConflict: 'domain' },
        );
        return;
      } catch { /* fall through */ }
    }
    console.error('saveLiveChecks (non-fatal):', e.message || e);
  }
}
