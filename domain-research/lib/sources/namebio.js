import { normalizeDomain, isValidDomain } from '../util.js';

// NameBio CheckDomain (paid, 1 credit). Returns recorded public sales for the
// EXACT domain — price, date, and venue. A strong signal of prior market value
// / liquidity, surfaced as a call-out in the Appraisal + Domain Owner reports.
// Needs both NAMEBIO_API_KEY and NAMEBIO_EMAIL (the API authenticates on the
// account email + key pair).
export default {
  name: 'namebio_sales',
  description:
    'NameBio previous-sales history (premium, 1 credit). Returns recorded public sales for the exact domain: '
    + 'price (USD), date, and venue (e.g. Private, Auction, Sedo). Empty when NameBio has no record. Strong '
    + 'evidence of prior market value and liquidity — supporting context, not ownership.',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  requiresKey: ['NAMEBIO_API_KEY', 'NAMEBIO_EMAIL'],
  async run({ domain }, { env } = {}) {
    const e = env || process.env;
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);
    const key = e.NAMEBIO_API_KEY;
    const email = e.NAMEBIO_EMAIL;
    if (!key || !email) throw new Error('NameBio not configured (set NAMEBIO_API_KEY and NAMEBIO_EMAIL)');

    const resp = await fetch('https://api.namebio.com/checkdomain/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, key, domain: d }).toString(),
    });
    const json = await resp.json().catch(() => null);
    if (!json) throw new Error(`NameBio: non-JSON response (HTTP ${resp.status})`);
    // A non-"success" status usually just means "no sales on record" — treat as
    // an empty (not failed) result so the call-out cleanly shows nothing.
    if (json.status && json.status !== 'success') {
      return { domain: d, sales: [], credits_remaining: json.credits_remaining ?? null, note: json.status_message || json.status };
    }
    const sales = (Array.isArray(json.sales) ? json.sales : [])
      .map((s) => ({ price: Number(s[0]) || null, date: s[1] || null, venue: s[2] || null }))
      .filter((s) => s.price != null)
      .sort((a, b) => (b.price || 0) - (a.price || 0));
    return { domain: d, sales, credits_remaining: json.credits_remaining ?? null };
  },
};
