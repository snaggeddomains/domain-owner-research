import { normalizeDomain, isValidDomain, fetchText, extractClues } from '../util.js';

// Free (no API credits) — best-effort fetch + parse of marketplace listing pages
// for a real for-sale signal (broker, price, "Make Offer"). Pages are HTML and
// some channels block bots, so each is fail-soft and a miss is NOT conclusive.
// GoDaddy and Dynadot hard-403 plain fetches (their search pages are bot-walled
// SPAs), so those are flagged `render` and routed through Scrape.do when a key
// is configured. Dan was removed — dan.com listings now redirect into GoDaddy.
function channelsFor(domain) {
  const label = domain.split('.')[0];
  const d = encodeURIComponent(domain);
  return [
    { channel: 'afternic', url: `https://www.afternic.com/domain/${domain}` },
    { channel: 'sedo', url: `https://sedo.com/search/details/?domain=${domain}` },
    { channel: 'atom', url: `https://www.atom.com/name/${label}` },
    { channel: 'godaddy', url: `https://www.godaddy.com/domainsearch/find?domainToCheck=${d}`, render: true },
    { channel: 'dynadot', url: `https://www.dynadot.com/domain/search?domain=${d}`, render: true },
  ];
}

const PRICE_RE = /(?:US)?\$\s?\d[\d,]{2,}(?:\.\d{2})?/g;

// A page can hard-block (403/429) or serve a tiny anti-bot challenge instead of
// real content — treat both as "blocked" so we know to escalate to a renderer.
function isBotWalled(status, body) {
  if (status === 403 || status === 429 || status === 0) return true;
  const t = String(body || '');
  return (
    t.length < 800 &&
    /just a moment|enable javascript|attention required|verify you are human|captcha|access denied|are you a robot/i.test(t)
  );
}

// Plain fetch first; if a `render` channel is bot-walled and Scrape.do is set,
// re-fetch through its residential anti-bot proxy with JS rendering (super=true
// is required to clear Cloudflare-class challenges).
async function fetchChannel({ url, render }, env) {
  let resp;
  try {
    resp = await fetchText(url, {}, 8000);
  } catch (e) {
    resp = { status: 0, body: '', error: String(e?.message || e) };
  }
  if (render && env?.SCRAPE_DO_API_KEY && isBotWalled(resp.status, resp.body)) {
    try {
      // customWait gives a JS SPA (GoDaddy loads its aftermarket price via a
      // post-load XHR) a moment to populate before the snapshot is taken.
      const api =
        `https://api.scrape.do/?token=${encodeURIComponent(env.SCRAPE_DO_API_KEY)}` +
        `&render=true&super=true&customWait=4000&url=${encodeURIComponent(url)}`;
      const r2 = await fetchText(api, {}, 35000);
      if (r2.body && r2.body.length > String(resp.body || '').length) {
        return { status: r2.status || 200, body: r2.body, rendered: true };
      }
    } catch {
      /* fall back to the plain (blocked) result */
    }
  }
  return { status: resp.status, body: resp.body, rendered: false };
}

function maxPriceUsd(body) {
  const nums = (String(body || '').match(PRICE_RE) || [])
    .map((s) => Number(s.replace(/[^\d.]/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? Math.max(...nums) : 0;
}

// Aftermarket "listed for sale" signals on registrar search pages (GoDaddy /
// Dynadot), beyond the generic parked-page phrases. A reg-fee price (~$10) next
// to "add to cart" means the name is AVAILABLE to register — NOT for sale — so
// the buy-now/premium signal only counts when paired with a real price (≥ $100).
function aftermarketSignals(body) {
  const low = String(body || '').toLowerCase();
  const out = [];
  if (/\bmake (?:an )?offer\b/.test(low)) out.push('make offer');
  if (/\b(?:this )?domain is for sale\b|\bfor sale by owner\b|\bdomain for sale\b|\bavailable for purchase\b|\blisted for sale\b/.test(low))
    out.push('for sale');
  if (/\bpremium domain\b/.test(low)) out.push('premium domain');
  const price = maxPriceUsd(body);
  if (price >= 100 && /\bbuy it now\b|\bbuy now\b/.test(low)) out.push('buy now');
  if (price >= 100 && /\bpremium\b/.test(low)) out.push('premium');
  return out;
}

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
    'Free, best-effort. Checks domain marketplaces (Afternic, Sedo, Atom, GoDaddy, Dynadot) for an active ' +
    'for-sale listing — price, "Make Offer"/"Buy It Now", and broker/platform. A listing often exposes the seller or ' +
    'broker. Each channel is fail-soft; some block automated fetches (GoDaddy/Dynadot are rendered via Scrape.do when ' +
    'configured), so a miss is not proof the domain is unlisted.',
  parameters: { type: 'object', properties: { domain: { type: 'string' } }, required: ['domain'] },
  async run({ domain }, ctx = {}) {
    const env = ctx.env || process.env || {};
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);

    const channels = await Promise.all(
      channelsFor(d).map(async ({ channel, url, render }) => {
        try {
          const resp = await fetchChannel({ url, render }, env);
          const ok = resp.status === 200;
          const clues = extractClues(resp.body || '');
          const signals = [...new Set([...clues.parking.for_sale_signals, ...aftermarketSignals(resp.body || '')])];
          const prices = [...new Set((String(resp.body || '').match(PRICE_RE) || []).slice(0, 5))];
          // A channel only counts as LISTED when the page actually resolves (200)
          // AND shows a real for-sale signal. A 404/403/410 page — or bare prices
          // that are just marketplace page-furniture — is NOT a listing.
          const listed = ok && signals.length > 0;
          return {
            channel,
            url,
            http_status: resp.status,
            rendered: resp.rendered,
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
