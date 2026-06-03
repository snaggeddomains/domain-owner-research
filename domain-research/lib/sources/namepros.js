import { fetchJson } from '../util.js';

// NamePros (namepros.com) — the main domain investor / trader FORUM. Sale
// ("WTS"), want-to-buy ("WTB"), auction, appraisal and discussion threads
// frequently NAME the seller/owner (a NamePros handle, sometimes a real name),
// the asking price, whether it sold, and a contact — owner-identification
// nuggets you won't find anywhere else. A handle can then be pivoted to a real
// identity. NamePros itself is login/Cloudflare-walled, so we reach it via a
// site-scoped Google (Serper) search; read_url the best threads for detail.
const ENDPOINT = 'https://google.serper.dev/search';
const SITE = 'namepros.com';

export default {
  name: 'namepros_search',
  description:
    'Search NamePros (namepros.com) — the main domain investor/trader forum — for a DOMAIN or a person/handle. ' +
    'WTS (sale), WTB, auction, appraisal and discussion threads often NAME the seller/owner, the asking price, ' +
    'whether it sold, and a contact — strong owner-ID leads. Pass the exact domain to find threads about it, and/or ' +
    'a name/handle to find that trader. Returns matching threads (title, link, snippet); follow up with read_url on ' +
    'the best ones, and pivot any NamePros handle to a real identity. A thread is NOT a live marketplace listing — ' +
    'do not call the domain "for sale" unless the thread actually says so and is current.',
  parameters: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Exact domain to find NamePros threads about, e.g. drive.com' },
      query: { type: 'string', description: 'Alternatively/additionally a name, NamePros handle, or phrase to search' },
    },
  },
  requiresKey: ['SERPER_API_KEY'],
  async run({ domain, query }, { env }) {
    const terms = [];
    if (domain) terms.push(`"${String(domain).trim()}"`);
    if (query) terms.push(String(query).trim());
    if (!terms.length) throw new Error('Provide a domain and/or query to search NamePros.');

    const search = async (q) => {
      const data = await fetchJson(ENDPOINT, {
        method: 'POST',
        headers: { 'X-API-KEY': env.SERPER_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ q, num: 10 }),
      });
      const organic = Array.isArray(data && data.organic) ? data.organic : [];
      return { query: q, results: organic.slice(0, 10).map((r) => ({ title: r.title, link: r.link, snippet: r.snippet })) };
    };

    const scoped = `${terms.join(' ')} site:${SITE}`;
    try {
      return await search(scoped);
    } catch (e) {
      // Serper's free plan rejects site:/quotes (HTTP 400) — fall back to plain
      // keywords with "namepros" so the search still returns something.
      if (/\b400\b|not allowed/i.test(String(e?.message || e))) {
        const plain = `${[domain, query].filter(Boolean).join(' ')} namepros`.replace(/["']/g, '').trim();
        if (plain) return await search(plain);
      }
      throw e;
    }
  },
};
