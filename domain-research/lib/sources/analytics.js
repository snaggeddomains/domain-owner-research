import { fetchText } from '../util.js';

// Free, keyless. Extracts a site's tracking/analytics fingerprint from its live
// HTML (Google Tag Manager, GA4, Universal Analytics, AdSense, Meta Pixel). Its
// best use is COMPARING two URLs: a shared GTM/Pixel/GA/AdSense ID between a
// marketplace lander and a candidate seller portfolio is decisive proof the
// same operator controls both (the bngo.com → DomainMan.com link). To find
// OTHER sites sharing an ID, web_search/brave_search the raw ID and read_url the
// hits (a paid publicwww/BuiltWith reverse lookup would do this in one call).
function extractIds(html) {
  const h = String(html || '');
  const uniq = (re) => [...new Set(h.match(re) || [])].slice(0, 10);
  const out = {};
  const gtm = uniq(/GTM-[A-Z0-9]{4,9}/g);
  const ga4 = uniq(/\bG-[A-Z0-9]{6,12}\b/g);
  const ua = uniq(/\bUA-\d{4,10}-\d{1,4}\b/g);
  const adsense = uniq(/ca-pub-\d{10,20}/g);
  const fb = new Set();
  for (const m of h.matchAll(/fbq\(\s*['"]init['"]\s*,\s*['"](\d{10,20})['"]/g)) fb.add(m[1]);
  for (const m of h.matchAll(/facebook\.net[^"']*[?&]id=(\d{10,20})/g)) fb.add(m[1]);
  if (gtm.length) out.gtm = gtm;
  if (ga4.length) out.ga4 = ga4;
  if (ua.length) out.ua = ua;
  if (adsense.length) out.adsense = adsense;
  if (fb.size) out.fb_pixel = [...fb].slice(0, 10);
  return out;
}

const HIGH_SIGNAL = ['gtm', 'ga4', 'ua', 'adsense', 'fb_pixel'];

export default {
  name: 'analytics_footprint',
  description:
    "Extract a site's tracking/analytics fingerprint (Google Tag Manager GTM-, GA4 G-, Universal UA-, AdSense " +
    'ca-pub-, Meta/Facebook Pixel) from its live HTML. Optionally COMPARE two URLs to prove common ownership: a ' +
    'shared GTM/Pixel/GA/AdSense ID between a marketplace lander and a candidate seller portfolio is strong evidence ' +
    'the same operator controls both. To find OTHER sites sharing an ID, web_search/brave_search the raw ID string ' +
    '(e.g. "GTM-XXXXXX") and read_url the hits.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Primary site URL or domain' },
      compare: { type: 'string', description: 'Optional second URL/domain to fingerprint-match against' },
    },
    required: ['url'],
  },
  async run({ url, compare }) {
    const norm = (u) => (/^https?:\/\//i.test(u) ? u : `https://${String(u).trim()}`);
    const grab = async (u) => {
      try {
        const r = await fetchText(norm(u), {}, 10000);
        return { url: norm(u), status: r.status, ids: extractIds(r.body) };
      } catch (e) {
        return { url: norm(u), error: String(e?.message || e), ids: {} };
      }
    };
    const a = await grab(url);
    if (!compare) return a;
    const b = await grab(compare);
    const shared = {};
    for (const k of Object.keys(a.ids)) {
      const inter = (a.ids[k] || []).filter((x) => (b.ids[k] || []).includes(x));
      if (inter.length) shared[k] = inter;
    }
    const same = HIGH_SIGNAL.some((k) => shared[k] && shared[k].length);
    return {
      a,
      b,
      shared,
      same_operator: same,
      note: same
        ? 'Shared high-signal tracking ID(s) — strong evidence the same operator controls both sites.'
        : 'No shared tracking IDs — inconclusive (sites may still be related).',
    };
  },
};
