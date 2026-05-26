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
          const clues = extractClues(resp.body || '');
          const prices = [...new Set((resp.body.match(PRICE_RE) || []).slice(0, 5))];
          const listed = clues.parking.for_sale_signals.length > 0 || prices.length > 0;
          return {
            channel,
            url,
            http_status: resp.status,
            listed,
            for_sale_signals: clues.parking.for_sale_signals,
            prices,
            emails: clues.emails.slice(0, 5),
          };
        } catch (e) {
          return { channel, url, error: String(e?.message || e) };
        }
      }),
    );

    return { domain: d, channels };
  },
};
