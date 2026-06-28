// Pull REAL transaction comps from the Snagged Domain Tracker (the "master
// transaction list") via snagged-admin's internal endpoint — the Deals tab, where
// each row is a domain + the actual Acquisition Price it changed hands at. This is
// the gold-standard comp (real prices, not marketplace asking). The admin app holds
// the Google Sheets creds; we call it server-to-server with the shared secret
// (same pattern as lib/email/threads.js).
//
// Env: ADMIN_INTERNAL_BASE (default https://app.snagged.com) + RESEARCH_INTERNAL_SECRET.
// Unset → degrades gracefully (returns null; the comp section just omits it).

const BASE = (process.env.ADMIN_INTERNAL_BASE || 'https://app.snagged.com').replace(/\/+$/, '');
const SECRET = process.env.RESEARCH_INTERNAL_SECRET || '';

export function trackerCompsConfigured() {
  return Boolean(SECRET);
}

// { sld, tld, len } → { deals:[{domain,price,status,relation}], total_priced } or null.
export async function trackerComps({ sld, tld, len }, _env = process.env) {
  if (!SECRET) return null;
  const params = new URLSearchParams();
  if (sld) params.set('sld', sld);
  if (tld) params.set('tld', tld);
  if (len) params.set('len', String(len));
  params.set('max', '25');
  const url = `${BASE}/api/internal/sales-comps?${params.toString()}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { headers: { 'x-internal-secret': SECRET }, signal: ctrl.signal });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) return null;
    const deals = Array.isArray(data.deals) ? data.deals.filter((d) => d && d.domain && d.price > 0) : [];
    if (!deals.length) return null;
    return { deals, total_priced: data.total_priced ?? null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default { trackerComps, trackerCompsConfigured };
