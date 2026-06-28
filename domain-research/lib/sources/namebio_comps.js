import { normalizeDomain, isValidDomain } from '../util.js';

// NameBio Comps engine (paid, ~25 credits). Unlike namebio_sales (recorded sales
// of the EXACT domain), this returns up to 25 of the most RELEVANT comparable
// retail sales for a name — similar keywords/extensions — which is the actual
// "comps" a broker reaches for when there's no exact-domain sale on record.
// Each row: [domain, price, date, venue]. Needs NAMEBIO_API_KEY + NAMEBIO_EMAIL.
//
// agentExcluded: the autonomous research agent never calls it (25 credits/call);
// only SNAP Eval does, cache-first per domain.
const ENDPOINT = 'https://api.namebio.com/comps/';

export default {
  name: 'namebio_comps',
  description:
    'NameBio comparable sales (premium, ~25 credits). Returns up to 25 of the most relevant recorded retail '
    + 'sales for a name (similar keywords/extensions), each with price (USD), date, and venue — the real comps '
    + 'for pricing a domain when there is no exact-domain sale on record. Supporting context, not ownership.',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  requiresKey: ['NAMEBIO_API_KEY', 'NAMEBIO_EMAIL'],
  agentExcluded: true,
  async run({ domain }, { env } = {}) {
    const e = env || process.env;
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);
    const key = e.NAMEBIO_API_KEY;
    const email = e.NAMEBIO_EMAIL;
    if (!key || !email) throw new Error('NameBio not configured (set NAMEBIO_API_KEY and NAMEBIO_EMAIL)');

    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email,
        key,
        domain: d,
        price_from: '100', // include sub-$1k comps (default is 1000) — these names sit lower
        order_by: 'date',
        order_dir: 'desc',
      }).toString(),
    });
    const text = await resp.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    // Surface the reason instead of throwing, so the UI/diag can show WHY it's empty
    // (e.g. a plan that doesn't include the Comps engine, or insufficient credits).
    if (!json) {
      return { domain: d, comps: [], note: `HTTP ${resp.status}: ${String(text).slice(0, 160)}` };
    }
    if (json.status && json.status !== 'success') {
      return { domain: d, comps: [], credits_remaining: json.credits_remaining ?? null, note: json.status_message || json.status };
    }
    // comps rows are [domain, price, date, venue] (price is a string).
    const comps = (Array.isArray(json.comps) ? json.comps : [])
      .map((row) => ({
        domain: row[0] || null,
        price: Number(String(row[1] || '').replace(/[^0-9.]/g, '')) || null,
        date: row[2] || null,
        venue: row[3] || null,
      }))
      .filter((c) => c.domain && c.price != null)
      .sort((a, b) => (b.price || 0) - (a.price || 0));
    return {
      domain: d,
      sld: json.sld || null,
      tld: json.tld || null,
      comps,
      credits_remaining: json.credits_remaining ?? null,
    };
  },
};
