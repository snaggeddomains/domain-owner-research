import { normalizeDomain, isValidDomain, fetchText, extractClues } from '../util.js';

// Free. The live site is often the fastest path to an owner — a real business
// exposes a company name/contact, and a parked domain exposes the broker /
// "make offer" path and the parking platform.
export default {
  name: 'livesite_inspect',
  description:
    "Free. Fetches the domain's live website (https, falling back to http) and extracts ownership clues from the " +
    'page and its source: title, company/brand hints, emails, social links, analytics IDs (GA/GTM/Meta Pixel), ' +
    'copyright line, and parking/for-sale signals (parking platform, broker, "Make Offer"). For parked domains ' +
    'this frequently surfaces the broker or seller.',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  async run({ domain }) {
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);

    let resp = null;
    let scheme = 'https';
    try {
      resp = await fetchText(`https://${d}/`);
    } catch (e) {
      try {
        resp = await fetchText(`http://${d}/`);
        scheme = 'http';
      } catch (e2) {
        return { reachable: false, error: `Could not fetch over https or http: ${e2?.message || e2}` };
      }
    }

    return {
      reachable: true,
      scheme,
      http_status: resp.status,
      final_url: resp.finalUrl,
      ...extractClues(resp.body || ''),
    };
  },
};
