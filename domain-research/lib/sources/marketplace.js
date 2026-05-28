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
    // afternic is a pure listing page: the URL only renders meaningful content
    // (price / "Make Offer") when the domain is actually listed. sedo/atom/
    // godaddy/dynadot/spaceship are search pages that render many results, so
    // they're flagged `searchPage` and detection is scoped to text around the
    // searched domain. godaddy/dynadot/spaceship are JS SPAs (`render: true`).
    { channel: 'afternic', url: `https://www.afternic.com/domain/${domain}` },
    { channel: 'sedo', url: `https://sedo.com/search/?keyword=${d}`, searchPage: true },
    { channel: 'atom', url: `https://www.atom.com/name/${label}`, searchPage: true },
    { channel: 'godaddy', url: `https://www.godaddy.com/domainsearch/find?domainToCheck=${d}`, render: true, searchPage: true },
    { channel: 'dynadot', url: `https://www.dynadot.com/domain/search?domain=${d}`, render: true, searchPage: true },
    { channel: 'spaceship', url: `https://www.spaceship.com/domain-search/?query=${d}&tab=domains`, render: true, searchPage: true },
  ];
}

const PRICE_RE = /(?:US)?\$\s?\d[\d,]{2,}(?:\.\d{2})?/g;

// `render` channels are JS SPAs (GoDaddy/Dynadot/Spaceship): their meaningful
// result is rendered client-side, and a plain fetch returns either a 403 wall
// OR — worse — a 200 *shell* full of template furniture ("Make Offer", sample
// prices) that has nothing to do with the searched domain and causes false
// positives. So these MUST be rendered through Scrape.do; if the render can't
// be obtained we return an empty result (not-listed) rather than trust the
// shell. customWait lets a post-load XHR (e.g. GoDaddy's price) populate first.
async function fetchChannel({ url, render }, env) {
  if (render) {
    if (!env?.SCRAPE_DO_API_KEY) return { status: 0, body: '', rendered: false, finalUrl: url };
    try {
      const api =
        `https://api.scrape.do/?token=${encodeURIComponent(env.SCRAPE_DO_API_KEY)}` +
        `&render=true&super=true&customWait=4000&url=${encodeURIComponent(url)}`;
      const r2 = await fetchText(api, {}, 35000);
      if (r2.status === 200 && r2.body && r2.body.length > 500) {
        return { status: 200, body: r2.body, rendered: true, finalUrl: url };
      }
    } catch {
      /* render unavailable — fall through to the empty (not-listed) result */
    }
    return { status: 0, body: '', rendered: false, finalUrl: url };
  }
  // Plain (non-render) channels — the response is server-rendered HTML we can parse directly.
  let resp;
  try {
    resp = await fetchText(url, {}, 8000);
  } catch (e) {
    resp = { status: 0, body: '', error: String(e?.message || e) };
  }
  return { status: resp.status, body: resp.body, rendered: false, finalUrl: resp.finalUrl || url };
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
  // Spaceship tags an aftermarket listing "AFTERMARKET" next to a "Make Offer" —
  // gated by an offer/price so a bare "Aftermarket" filter tab isn't a hit.
  if (/\baftermarket\b/.test(low) && (/\bmake (?:an )?offer\b/.test(low) || price >= 100)) out.push('aftermarket');
  return out;
}

// Hosts that are standard marketplaces/registrars/parking — NOT a seller's own
// branded portfolio. A redirect to anything outside this set that still shows a
// for-sale signal is a candidate seller portfolio (e.g. domainman.com) that may
// name the owner.
const KNOWN_PLATFORM_RE =
  /(?:^|\.)(?:afternic|atom|squadhelp|sedo|dan|godaddy|namecheap|hugedomains|buydomains|undeveloped|efty|dynadot|spaceship|sav|flippa|namebright|epik|uniregistry|bodis|parkingcrew|sedoparking|above|smartname|voodoo|domainmarket|brandbucket)\.[a-z.]+$/i;
const hostOf = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
};

// Check one marketplace channel and classify it. LISTED only when the page
// resolves (200) AND shows a real for-sale signal; a 404/403 page — or bare
// prices that are just marketplace page-furniture — is NOT a listing.
// Search/availability SPAs (Atom, GoDaddy, Dynadot, Spaceship) render EVERY
// result state into the DOM, so generic for-sale words ("Make Offer", "premium",
// a price) leak from hidden template markup even for a plain registered domain.
// When the page explicitly states the searched name is taken/registered — or
// only offers to broker it (you hire a broker for a name that ISN'T listed) —
// it is NOT a marketplace listing, so override the positive. ("Registered in
// 1996" is Spaceship's taken badge; an aftermarket listing shows "AFTERMARKET".)
const NOT_FOR_SALE_RE = /\btaken\b|\bregistered in \d{4}\b|\bhire a broker\b|\bget this domain\b/i;

// Atom shows this while a listing is mid-onboarding — the seller has claimed the
// name but DNS/ownership isn't verified, so the for-sale landing isn't live yet.
// Not a clean listing and not a plain miss → surfaced as a "pending" (yellow).
const ATOM_PENDING_RE =
  /ownership of this domain is not yet verified|landing page will be live once the ownership|verifying the dns status/i;

// Strip tags to plain text so proximity is measured in WORDS, not markup. In raw
// HTML a result row's price/"Taken" label can sit hundreds of chars (buttons,
// SVGs) away from the domain name; in stripped text they're adjacent.
function toText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// The for-sale phrases extractClues looks for, usable on an arbitrary text slice.
const FOR_SALE_PHRASES = [
  'buy this domain', 'domain is for sale', 'this domain is for sale', 'make offer',
  'make an offer', 'inquire about this domain', 'domain for sale',
];
function forSaleSignals(text) {
  const low = String(text || '').toLowerCase();
  const out = FOR_SALE_PHRASES.filter((p) => low.includes(p));
  return [...new Set([...out, ...aftermarketSignals(text)])];
}

// Text windows around each mention of the searched domain — so signals from the
// other 44 results / suggestions / TLDs on a search page can't leak in.
function domainWindows(text, domain) {
  const low = text.toLowerCase();
  const t = String(domain || '').toLowerCase();
  if (!t) return [];
  const wins = [];
  let i = 0;
  let n = 0;
  while ((i = low.indexOf(t, i)) !== -1 && n < 8) {
    wins.push(text.slice(Math.max(0, i - 80), i + 220));
    i += t.length;
    n += 1;
  }
  return wins;
}

async function checkChannel({ channel, url, render, searchPage }, env, domain) {
  try {
    const resp = await fetchChannel({ url, render }, env);
    const body = String(resp.body || '');
    const ok = resp.status === 200;
    const clues = extractClues(body);
    let signals;
    let prices;
    let listed;
    let suppressed = null;
    let unverified = false;

    if (searchPage) {
      // Scope detection to the text right around the searched domain. A search
      // SPA lists many other names whose prices/"for sale" would otherwise leak
      // in, and renders all result states into the DOM. If the domain isn't even
      // named in its own result, there's no listing for it here.
      const text = toText(body);
      const wins = domainWindows(text, domain);
      const ctx = wins.join('  ');
      signals = forSaleSignals(ctx);
      prices = [...new Set((ctx.match(PRICE_RE) || []).slice(0, 5))];
      listed = ok && wins.length > 0 && signals.length > 0;
      if (listed && NOT_FOR_SALE_RE.test(ctx)) {
        listed = false;
        suppressed = 'registered/taken';
      }
      if (channel === 'atom') {
        if (ATOM_PENDING_RE.test(text)) {
          // Listing claimed but not yet verified/live — pending, not a miss.
          listed = false;
          unverified = true;
          suppressed = null;
        } else {
          // Atom also redirects an unlisted name to its generic "Premium Domains"
          // landing — make sure we're on a real /name/ listing, not the landing.
          const fu = String(resp.finalUrl || url).toLowerCase();
          const onListing = /atom\.com\/name\//.test(fu) && !/premium-domains-for-sale/.test(fu);
          const landingHero = /search \d+k\+? premium|premium domain names|ai-powered domain discovery/i.test(text);
          if (!onListing || landingHero) {
            listed = false;
            suppressed = suppressed || 'not-a-listing';
          }
        }
      }
    } else {
      // Pure listing page (Afternic) — the page is about this one domain.
      signals = [...new Set([...clues.parking.for_sale_signals, ...aftermarketSignals(body)])];
      prices = [...new Set((body.match(PRICE_RE) || []).slice(0, 5))];
      listed = ok && signals.length > 0;
    }

    return {
      channel,
      url,
      http_status: resp.status,
      rendered: resp.rendered,
      listed,
      unverified,
      for_sale_signals: listed ? signals : [],
      prices: listed ? prices : [],
      emails: clues.emails.slice(0, 5),
      ...(suppressed ? { suppressed } : {}),
    };
  } catch (e) {
    return { channel, url, listed: false, error: String(e?.message || e) };
  }
}

export default {
  name: 'marketplace_check',
  description:
    'Free, best-effort. Checks domain marketplaces (Afternic, Sedo, Atom, GoDaddy, Dynadot, Spaceship) for an active ' +
    'for-sale listing — price, "Make Offer"/"Buy It Now", and broker/platform. A listing often exposes the seller or ' +
    'broker. Each channel is fail-soft; some block automated fetches (GoDaddy/Dynadot/Spaceship are rendered via ' +
    'Scrape.do when configured), so a miss is not proof the domain is unlisted. Pass an optional `channel` to check ' +
    'just one (afternic|sedo|atom|godaddy|dynadot|spaceship).',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' }, channel: { type: 'string' } },
    required: ['domain'],
  },
  async run({ domain, channel }, ctx = {}) {
    const env = ctx.env || process.env || {};
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);
    const defs = channelsFor(d);

    // Single-channel fast path — lets the UI stream one marketplace at a time
    // instead of waiting for the whole batch. Skips the seller-portfolio probe.
    if (channel) {
      const def = defs.find((c) => c.channel === channel);
      if (!def) throw new Error(`Unknown channel: ${channel}`);
      return { domain: d, channels: [await checkChannel(def, env, d)] };
    }

    const channels = await Promise.all(defs.map((def) => checkChannel(def, env, d)));

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
