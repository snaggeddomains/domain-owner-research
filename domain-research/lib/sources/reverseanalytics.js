import { fetchText, fetchJson } from '../util.js';

// Reverse-analytics — the missing half of analytics_footprint. Given a tracking ID
// (GA4 G-, Universal UA-, GTM-, AdSense ca-pub-, a Meta pixel id) it finds OTHER
// sites carrying the SAME id = the same operator's portfolio. This is a decisive
// ownership-cluster signal (analytics_footprint EXTRACTS the id; this reverses it).
//
// Needs a key (there's no reliable FREE reverse). Two providers, whichever is set:
//   - PublicWWW (PUBLICWWW_API_KEY): source-code search, exact-string match, CSV export.
//   - DNSlytics (DNSLYTICS_API_KEY): dedicated reverse-analytics endpoint.
// Fail-open: no key → withheld from the tool list (requiresKey); a provider error throws.

function cleanId(raw) {
  return String(raw || '').trim().replace(/^["']|["']$/g, '');
}

async function viaPublicWWW(id, env) {
  const url = `https://publicwww.com/websites/%22${encodeURIComponent(id)}%22/?export=csvsemicolon&key=${env.PUBLICWWW_API_KEY}`;
  const csv = await fetchText(url, {}, 15000);
  // CSV: one host per line (may carry extra ;columns). Skip a header line if present.
  const domains = [];
  for (const line of String(csv || '').split(/\r?\n/)) {
    const cell = line.split(';')[0].trim().toLowerCase();
    if (!cell || cell === 'url' || cell === 'domain' || !cell.includes('.')) continue;
    const host = cell.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    if (host.includes('.')) domains.push(host);
  }
  return { provider: 'publicwww', domains: [...new Set(domains)] };
}

async function viaDnslytics(id, env) {
  const data = await fetchJson(`https://api.dnslytics.net/v1/reverseanalytics/${encodeURIComponent(id)}?apikey=${env.DNSLYTICS_API_KEY}`, {}, 15000);
  const rows = (data && (data.domains || data.data || [])) || [];
  const domains = rows.map((x) => (typeof x === 'string' ? x : (x.domain || x.name || ''))).map((s) => String(s).toLowerCase()).filter((s) => s.includes('.'));
  return { provider: 'dnslytics', domains: [...new Set(domains)] };
}

export default {
  name: 'reverse_analytics',
  description:
    'Reverse-lookup a tracking/analytics id (GA4 G-…, Universal UA-…, GTM-…, AdSense ca-pub-…, Meta pixel) to every ' +
    'OTHER website carrying the SAME id — i.e. the operator\'s portfolio. Decisive same-owner clustering: pair it ' +
    'with analytics_footprint (which extracts the id from a site) to expand one domain into the whole footprint, ' +
    'then find a sibling with public ownership info. Pass the raw id string.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The tracking id, e.g. "UA-12345-1", "G-ABC123", "GTM-XXXX", "ca-pub-123…", or a Meta pixel id' },
    },
    required: ['id'],
  },
  requiresKey: [['PUBLICWWW_API_KEY', 'DNSLYTICS_API_KEY']],
  async run({ id }, { env }) {
    const cid = cleanId(id);
    if (!cid) throw new Error('id required');
    const res = env.PUBLICWWW_API_KEY ? await viaPublicWWW(cid, env) : await viaDnslytics(cid, env);
    return {
      id: cid,
      provider: res.provider,
      count: res.domains.length,
      domains: res.domains.slice(0, 100),
      note: res.domains.length
        ? 'These sites share the tracking id — candidate same-owner properties.'
        : 'No other sites found sharing this id (or the id is too new/rare to be indexed).',
    };
  },
};
