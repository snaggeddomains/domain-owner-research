import { normalizeDomain, isValidDomain, fetchText, extractClues } from '../util.js';

// Free (no API credits) — best-effort fetch + parse of marketplace listing pages
// for a real for-sale signal (broker, price, "Make Offer"). Pages are HTML and
// some channels block bots, so each is fail-soft and a miss is NOT conclusive.
function channelsFor(domain) {
  const label = domain.split('.')[0];
  return [
    { channel: 'afternic', url: `https://www.afternic.com/domain/${domain}` },
    { channel: 'sedo', url: `https://sedo.com/search/details/?domain=${domain}` },
    { channel: 'dan', url: `https://dan.com/buy-domain/${domain}` },
    { channel: 'atom', url: `https://www.atom.com/name/${label}` },
    { channel: 'godaddy', url: `https://www.godaddy.com/domain-auctions/${domain}` },
  ];
}

const PRICE_RE = /(?:US)?\$\s?\d[\d,]{2,}(?:\.\d{2})?/g;

// Hosts that are standard marketplaces/registrars/parking — NOT a seller's own
// branded portfolio. A redirect to anything outside this set that still shows a
// for-sale signal is a candidate seller portfolio (e.g. domainman.com) that may
// name the owner.
const KNOWN_PLATFORM_RE =
  /(?:^|\.)(?:afternic|atom|squadhelp|sedo|dan|godaddy|namecheap|hugedomains|buydomains|undeveloped|efty|dynadot|sav|flippa|namebright|epik|uniregistry|bodis|parkingcrew|sedoparking|above|smartname|voodoo|domainmarket|brandbucket)\.[a-z.]+$/i;
const hostOf = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
};

export default {
  name: 'marketplace_check',
  description:
    'Free, best-effort. Checks domain marketplaces (Afternic, Sedo, Dan, Atom, GoDaddy auctions) for an active ' +
    'for-sale listing — price, "Make Offer"/"Buy Now", and broker/platform. A listing often exposes the seller or ' +
    'broker. Each channel is fail-soft; some block automated fetches, so a miss is not proof the domain is unlisted.',
  parameters: { type: 'object', properties: { domain: { type: 'string' } }, required: ['domain'] },
  async run({ domain }) {
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);

    const channels = await Promise.all(
      channelsFor(d).map(async ({ channel, url }) => {
        try {
          const resp = await fetchText(url, {}, 8000);
          const ok = resp.status === 200;
          const clues = extractClues(resp.body || '');
          const signals = clues.parking.for_sale_signals;
          const prices = [...new Set((resp.body.match(PRICE_RE) || []).slice(0, 5))];
          // A channel only counts as LISTED when the page actually resolves (200)
          // AND shows a real for-sale signal. A 404/403/410 page — or bare prices
          // that are just marketplace page-furniture — is NOT a listing.
          const listed = ok && signals.length > 0;
          return {
            channel,
            url,
            http_status: resp.status,
            listed,
            for_sale_signals: signals,
            prices: listed ? prices : [],
            emails: clues.emails.slice(0, 5),
          };
        } catch (e) {
          return { channel, url, listed: false, error: String(e?.message || e) };
        }
      }),
    );

    // Seller-portfolio detector: visit the domain itself and see where it lands.
    // A redirect to a NON-major-marketplace host that shows a for-sale signal is
    // likely the seller's own branded portfolio — which often names the owner.
    let seller_portfolio = null;
    try {
      const r = await fetchText(`http://${d}/`, {}, 8000);
      const finalHost = hostOf(r.finalUrl || '');
      const clues = extractClues(r.body || '');
      const forSale = clues.parking.for_sale_signals.length > 0 || PRICE_RE.test(r.body || '');
      if (finalHost && finalHost !== d && !KNOWN_PLATFORM_RE.test(finalHost)) {
        seller_portfolio = {
          landing_host: finalHost,
          landing_url: r.finalUrl,
          for_sale: forSale,
          note: 'Domain redirects to a non-major-marketplace host — likely the seller’s own branded portfolio; investigate it (read_url + analytics_footprint) to identify the owner.',
        };
      }
    } catch {
      /* fail-soft */
    }

    return { domain: d, any_listed: channels.some((c) => c.listed), seller_portfolio, channels };
  },
};
