// Brand-variation sweep — enumerate a locked brand word's variations, then check
// each LIVE for: is it for sale (and at what price / on which marketplace) via
// DomainScout, and is it registered or available to hand-register. This is the tool
// for a client who's committed to their name and wants the domain landscape around
// it. Everything is best-effort + fail-open; a missing DomainScout key just drops
// the price column (availability still resolves via DNS).
import dns from 'node:dns/promises';
import { enumerateVariations, PREFIXES, SUFFIXES, TLDS } from './enumerate.js';
import { lookupDomain, isConfigured } from '../domainscout.js';
import { rdapDomainStatus } from '../nameserver/query.js';
import { lookupInternal, internalForRow } from './corpus.js';
import { porkbunCheck, porkbunConfigured } from './availability.js';
import { filterDictionaryWords } from '../db/dictionary.js';
import { fetchText, extractClues } from '../util.js';

const CONCURRENCY = 12;
const SITE_TIMEOUT_MS = 7000;

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

// Registered vs available (+ the NS records). A name that resolves NS is
// registered; NXDOMAIN / ENOTFOUND ⇒ available to hand-register; anything else ⇒
// unknown. ccTLDs answer here even when RDAP bootstrap misses them.
async function registrationStatus(domain) {
  try {
    const ns = await dns.resolveNs(domain);
    return { status: 'registered', nameservers: ns || [] };
  } catch (e) {
    const code = e && e.code;
    if (code === 'ENOTFOUND' || code === 'NXDOMAIN') return { status: 'available', nameservers: [] };
    if (code === 'ENODATA') return { status: 'registered', nameservers: [] };
    return { status: 'unknown', nameservers: [] };
  }
}

// A domain parked on a MARKETPLACE's nameservers is listed for sale RIGHT NOW —
// an immediate, reliable signal that doesn't depend on DomainScout monitoring the
// domain first (sentinel.gg → dan.com NS = on Dan; sentinel.so → atom.com = on Atom).
// Maps a marketplace NS suffix → { name, link(domain) }.
const MARKETPLACE_NS = [
  { suffix: 'dan.com', name: 'Dan', link: (d) => `https://dan.com/buy-domain/${d}` },
  { suffix: 'undeveloped.com', name: 'Dan', link: (d) => `https://dan.com/buy-domain/${d}` },
  { suffix: 'atom.com', name: 'Atom', link: (d) => `https://www.atom.com/name/${d.split('.')[0]}` },
  { suffix: 'afternic.com', name: 'Afternic', link: (d) => `https://www.afternic.com/domain/${d}` },
  { suffix: 'above.com', name: 'Afternic', link: (d) => `https://www.afternic.com/domain/${d}` },
  { suffix: 'sedoparking.com', name: 'Sedo', link: (d) => `https://sedo.com/search/details/?domain=${d}` },
  { suffix: 'sedo.com', name: 'Sedo', link: (d) => `https://sedo.com/search/details/?domain=${d}` },
  { suffix: 'hugedomains.com', name: 'HugeDomains', link: (d) => `https://www.hugedomains.com/domain_profile.cfm?d=${d}` },
  { suffix: 'sav.com', name: 'Sav', link: (d) => `https://www.sav.com/${d}` },
  { suffix: 'efty.com', name: 'Efty', link: () => null },
  { suffix: 'bodis.com', name: 'parked (Bodis)', link: () => null },
  { suffix: 'parkingcrew.net', name: 'parked (ParkingCrew)', link: () => null },
];
function marketplaceFromNs(nameservers, domain) {
  const ns = (nameservers || []).map((n) => String(n || '').toLowerCase());
  for (const m of MARKETPLACE_NS) {
    if (ns.some((n) => n === m.suffix || n.endsWith('.' + m.suffix))) {
      return { name: m.name, link: m.link(domain), parkingOnly: m.name.startsWith('parked') };
    }
  }
  return null;
}

// Live-crawl the candidate and categorize what's ACTUALLY on the page — we don't
// trust nameservers or DomainScout alone (a name can carry a custom "for sale"
// page the owner built, be a real active site, or not resolve at all). Returns
// { site: 'for_sale'|'active'|'parked'|'no_resolve'|'error', title, for_sale_page,
// evidence } — where for_sale_page means an EXPLICIT for-sale page (own or marketplace).
const MARKETPLACE_HOST_RE = /(^|\.)(dan\.com|afternic\.com|sedo\.com|atom\.com|hugedomains\.com|undeveloped\.com|efty\.com|sav\.com|above\.com|squadhelp\.com|brandbucket\.com)$/i;
// Registrar/holding landing pages — registered but NOT in active use. GoDaddy et al.
const HOLDING_RE = /future home of|website coming soon|coming soon|under construction|en construction|construction en cours|im aufbau|in aanbouw|domain (name )?is parked|parked (free|page)|parking page|parked domain|domain parked|is parked|this domain (name )?is (parked|registered|not configured|available)|default (web ?page|server page|page)|welcome to nginx|apache\b.{0,30}default|it works!|test page|this is the default|new site|placeholder|buy now this domain|this webpage is parked|account suspended|just another wordpress|example domain|new wordpress site/i;
// Website-builder DEFAULT template titles (Wix/Squarespace/GoDaddy Websites+Marketing/
// WordPress starters) — a site that was set up but never customized. Matched on the
// <title> ONLY: these strings ("My Company", "Site Title") are too generic to test
// against body prose (a real site can say "at my company…"), but as an exact page
// title they're an unmistakable never-launched placeholder.
const HOLDING_TITLE_RE = /^\s*(my (company|site|blog|website|store|shop|page)|site title|home\s*\|\s*my site|untitled|website builder|create your website)\s*$/i;

// Pull the asking price off a for-sale/marketplace page's HTML. Domain landers show
// the ask directly ($6,195 on HugeDomains, $29,888 on a custom page). Take the
// MOST-REPEATED sane amount (the real ask usually appears several times), tie-break
// to the max (a two-tier page's higher figure is the buy-now, the lower a lease/
// installment). Best-effort → null. Filters out financing noise ($100, $258.13).
function extractPrice(html) {
  const h = String(html || '');
  // schema.org Offer price (BrandBucket + others) — the authoritative ask, no "$".
  const jsonld = h.match(/"price"\s*:\s*"?(\d{2,7})(?:\.\d+)?"?/i);
  if (jsonld) { const n = Number(jsonld[1]); if (n >= 100 && n <= 5_000_000) return n; }
  const matches = h.match(/(?:USD|US\$|\$)\s?[\d][\d,]{1,9}(?:\.\d{2})?/gi) || [];
  const counts = new Map();
  for (const m of matches) {
    const n = Number(m.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(n) || n < 100 || n > 5_000_000 || /\.\d{2}$/.test(m)) continue; // drop cents (financing/monthly)
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  if (!counts.size) return null;
  let best = null;
  for (const [n, c] of counts) {
    if (!best || c > best.c || (c === best.c && n > best.n)) best = { n, c };
  }
  return best ? best.n : null;
}

// Afternic BIN price for a domain. The visible lander is JS-rendered, but the
// buy-now price is embedded in the page's JSON state as MICRO-dollars
// ("buyNow":19500000000 → $19,500). Afternic also fronts GoDaddy-brokered BINs, so
// this catches names that show "For sale · Afternic" with no crawl price. Best-effort → null.
const AFTERNIC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
async function afternicBin(domain) {
  try {
    const r = await fetchText(`https://www.afternic.com/domain/${domain}`, { headers: { 'user-agent': AFTERNIC_UA } }, SITE_TIMEOUT_MS);
    const forSale = /"isForSale":\s*true/.test(r.body || '');
    const m = (r.body || '').match(/"buyNow":\s*(\d{6,})/);
    if (!forSale || !m) return null;
    const price = Math.round(Number(m[1]) / 1e6);
    return (price >= 100 && price <= 5_000_000) ? price : null;
  } catch { return null; }
}

// Sedo asking price. Sedo's lander is a JS shell (the price is loaded client-side),
// and the /search/details page IP-allowlist-blocks scrapers — but the SAME data the
// browser reads sits behind a plain JSON endpoint the page's bundle calls:
//   GET /api/domain-details/information/<domain>  →  { domainPriceType, buynow:{
//     priceOptions:{ price, priceMin, currency:{name} } }, makeoffer }
// `price`/`priceMin` are in CENTS (nolan.io → 500000 eur = €5,000; sentinel.me →
// 500000/250000 usd = a $2,500–$5,000 Buy-Now-Plus range). 404 = Sedo doesn't list
// it; a `makeoffer` with no buynow = no fixed price (offer-only). Best-effort → null.
const SEDO_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const CUR_SYMBOL = { usd: '$', eur: '€', gbp: '£' };
async function sedoPrice(domain) {
  try {
    const r = await fetchText(`https://sedo.com/api/domain-details/information/${domain}`,
      { headers: { 'user-agent': SEDO_UA, accept: 'application/json', 'accept-language': 'us' } }, SITE_TIMEOUT_MS);
    let data; try { data = JSON.parse(r.body || 'null'); } catch { return null; }
    if (!data || data.status === 404) return null;
    const po = data.buynow && data.buynow.priceOptions;
    const raw = po && Number(po.price);
    if (!raw || !Number.isFinite(raw) || raw <= 0) {
      // Listed but offer-only (no Buy-Now price) — a real signal, just no number.
      if (data.domainPriceType === 'makeoffer' || data.makeoffer) return { makeOffer: true };
      return null;
    }
    const price = Math.round(raw / 100);
    if (price < 100 || price > 5_000_000) return null;
    const cur = ((po.currency && po.currency.name) || 'usd').toLowerCase();
    const min = po.priceMin > 0 ? Math.round(Number(po.priceMin) / 100) : 0;
    return { price, currency: cur, symbol: CUR_SYMBOL[cur] || '$', priceMin: min, buyNowPlus: !!po.isBuyNowPlus };
  } catch { return null; }
}

// Spaceship for-sale lander. The page is served IN PLACE on the domain (not a
// redirect) and embeds `window.DOMAIN_CONFIG` with the authoritative listing terms —
// which tell us the crucial difference between a FIRM buy-now price and a MINIMUM-
// OFFER floor (a name you can't just buy — you must offer AT LEAST $X and negotiate):
//   • buyItNowOnlyEnabled / ltoConfig.totalPrice → a real buy-now price (heysentinel
//     .com = $16,000);
//   • offerEnabled + minOfferPrice with NO buy-now → an offer floor only (nolan.ai =
//     "Requires a minimum $69,500 offer" — NOT a price you can pay).
// Returns { marketplace:'Spaceship', price?|minOffer? } or null when it's not a
// Spaceship lander. Best-effort — the config isn't strict JSON, so we regex fields.
function parseSpaceship(body) {
  if (!body || !/DOMAIN_CONFIG/.test(body) || !/spaceship/i.test(body)) return null;
  const bool = (k) => { const m = body.match(new RegExp(k + '\\s*:\\s*(true|false)')); return m ? m[1] === 'true' : null; };
  const money = (s) => { if (!s) return null; const n = Number(String(s).replace(/[^\d.]/g, '')); return Number.isFinite(n) && n >= 100 && n <= 5_000_000 ? Math.round(n) : null; };
  const minOffer = money((body.match(/minOfferPrice:\s*parseFloat\('([\d.]+)'\)/) || body.match(/minOfferPrice:\s*'?([\d.]+)'?/) || [])[1])
    || money((body.match(/formattedMinOfferPrice:\s*'([^']+)'/) || [])[1]);
  const buyNow = money((body.match(/totalPrice:\s*'([^']+)'/) || [])[1]);
  const offerEnabled = bool('offerEnabled');
  // A firm buy-now (LTO total or buy-it-now-only) wins; otherwise it's offer-floor-only.
  if (buyNow) return { marketplace: 'Spaceship', price: buyNow };
  if (offerEnabled && minOffer) return { marketplace: 'Spaceship', minOffer };
  if (minOffer) return { marketplace: 'Spaceship', minOffer };
  return { marketplace: 'Spaceship' };
}

// Friendly marketplace name from a listing page's host.
function mktName(host) {
  const h = (host || '').toLowerCase();
  if (h.includes('hugedomains')) return 'HugeDomains';
  if (h.includes('atom.com')) return 'Atom';
  if (h.includes('dan.com') || h.includes('undeveloped')) return 'Dan';
  if (h.includes('afternic') || h.includes('above.com')) return 'Afternic';
  if (h.includes('sedo')) return 'Sedo';
  if (h.includes('sav.com')) return 'Sav';
  if (h.includes('efty')) return 'Efty';
  if (h.includes('brandbucket')) return 'BrandBucket';
  if (h.includes('spaceship')) return 'Spaceship';
  return null;
}

async function inspectSite(domain) {
  let r = null;
  try { r = await fetchText(`https://${domain}`, {}, SITE_TIMEOUT_MS); } catch { r = null; }
  // Fall back to http when https THREW (SSL error) OR returned a bad status (a
  // parked page often 503s on https but serves the lander on http — withsentinel.com
  // 503→https, "porkbun.com | parked domain" on http).
  if (!r || r.status >= 400) {
    try { const h = await fetchText(`http://${domain}`, {}, SITE_TIMEOUT_MS); if (h && (!r || h.status < r.status)) r = h; } catch { /* keep r */ }
  }
  if (!r) return { site: 'no_resolve', title: null, for_sale_page: false, evidence: 'site did not resolve / no response' };
  let finalHost = '';
  try { finalHost = new URL(r.finalUrl || `https://${domain}`).host.replace(/^www\./, ''); } catch { /* ignore */ }
  const clues = extractClues(r.body || '');
  const ss = parseSpaceship(r.body || '');
  const forSaleText = clues.parking && clues.parking.for_sale_signals && clues.parking.for_sale_signals.length > 0;
  const onMarketplace = MARKETPLACE_HOST_RE.test(finalHost) || (clues.parking && clues.parking.platforms && clues.parking.platforms.length > 0);
  const parked = clues.parking && clues.parking.likely_parked;
  if (forSaleText || onMarketplace || ss) {
    const mk = (ss && ss.marketplace) || mktName(finalHost);
    // Spaceship config is authoritative on price vs offer-floor; otherwise scrape.
    let price = ss ? (ss.price || null) : null;
    const minOffer = ss ? (ss.minOffer || null) : null;
    if (!price && !minOffer) price = extractPrice(r.body);
    const where = ss ? 'Spaceship landing page'
      : MARKETPLACE_HOST_RE.test(finalHost) ? `redirects to ${finalHost}`
        : (clues.parking.platforms || [])[0] ? `${clues.parking.platforms[0]} landing page`
          : 'a custom "for sale" page';
    const tail = price ? ` · $${price.toLocaleString()}` : (minOffer ? ` · offers from $${minOffer.toLocaleString()}` : '');
    return { site: 'for_sale', title: clues.title, for_sale_page: true, price, min_offer: minOffer, marketplace: mk, listing_url: r.finalUrl || null, evidence: `for-sale page — ${where}${tail}` };
  }
  const title = clues.title;
  const holding = HOLDING_RE.test(clues.text_excerpt || '') || HOLDING_RE.test(title || '') || HOLDING_TITLE_RE.test((title || '').trim());
  if (holding) return { site: 'parked', title, for_sale_page: false, evidence: 'registrar/holding landing page — registered, not in active use' };
  if (parked) return { site: 'parked', title, for_sale_page: false, evidence: 'parked page (no explicit for-sale text)' };
  // ACTIVE vs registrar-holding. A branded <title> is the clearest signal — but many
  // real personal sites title themselves after their OWN name (nolan.so → "Nolan",
  // nolan.dev → "nolan.dev"), which a title-only check wrongly demotes. So we ALSO
  // rescue on real page CONTENT: a headline that isn't just the domain, a meta
  // description, or a genuinely navigable page (multiple links + real text). A
  // registrar holding has none of these (empty body, or h1 == the domain, ≤1 link).
  const sld = domain.split('.')[0];
  const dl = domain.toLowerCase();
  const body = r.body || '';
  const text = (clues.text_excerpt || '').trim();
  const linkCount = (body.match(/<a\s/gi) || []).length;
  const h1 = ((body.match(/<h1[^>]*>([\s\S]{0,160}?)<\/h1>/i) || [])[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const desc = (body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{12,})/i) || [])[1] || '';
  const isName = (s) => { const t = (s || '').toLowerCase().trim(); return !t || t === dl || t === sld; };
  const genericTitle = isName(title)
    || /^(index of|default|domain|welcome|coming soon|under construction|parked|home ?page|new site|untitled|website)/i.test((title || '').trim());
  const hasRealH1 = h1.length >= 3 && !isName(h1);
  const hasDesc = desc.trim().length >= 12;
  const richNav = linkCount >= 5 && text.length >= 50;
  if (r.ok && ((title && !genericTitle) || hasRealH1 || hasDesc || richNav)) {
    const label = (title && !genericTitle) ? title : (hasRealH1 ? h1 : (title || sld));
    return { site: 'active', title: title || h1 || null, for_sale_page: false, evidence: `active site — "${label}"` };
  }
  if (r.status >= 400) return { site: 'error', title, for_sale_page: false, evidence: `HTTP ${r.status} — registered, no live site` };
  // 200 but no branded title / empty body → a registrar holding or idle domain.
  return { site: 'parked', title, for_sale_page: false, evidence: 'resolves but no real site — registrar/holding or idle' };
}

// Rank by category: for-sale first (cheapest first — the buy-ready options), then
// available-to-register, then active/parked/held; .com ahead of other TLDs.
const CATEGORY_ORDER = { for_sale: 0, available: 1, parked: 2, active: 3, registered: 4, unknown: 5 };
function rankKey(r) {
  const isCom = r.domain.endsWith('.com') ? 0 : 1;
  const priced = (Number.isFinite(r.price) && r.price > 0) ? r.price : (r.min_offer > 0 ? r.min_offer : Infinity);
  return [CATEGORY_ORDER[r.category] ?? 5, priced, isCom];
}

// Sweep a seed word. Each candidate gets THREE independent signals — nameservers,
// DomainScout, and a live page crawl — merged into one category + for_sale flag.
// Returns { seed, domainscout, count, results:[{domain, kind, affix, category,
// for_sale, for_sale_source, price, currency, marketplace, link, site, title,
// evidence}] }.
export async function sweepVariations(seed, { env = process.env, excludeTlds = [], prefixes, suffixes, extraTlds = [] } = {}) {
  // Merge any industry-picked TLDs (.health/.care/…) into the base tier-1/2 set.
  const tlds = [...new Set([...TLDS, ...(Array.isArray(extraTlds) ? extraTlds : []).map((t) => String(t).replace(/^\./, '').toLowerCase())])];
  const cands = enumerateVariations(seed, { excludeTlds, tlds, ...(prefixes ? { prefixes } : {}), ...(suffixes ? { suffixes } : {}) });
  const dsOn = isConfigured(env);
  // Cross-reference OUR corpora (name_universe + Master) in parallel with the live
  // sweep — one batched exact-domain lookup, fail-open. Merged in after the sweep.
  const internalP = lookupInternal(cands.map((c) => c.domain)).catch(() => new Map());
  const results = await mapPool(cands, CONCURRENCY, async (c) => {
    // Two live signals in parallel: DNS (registered/available + nameservers) and a
    // page crawl (for-sale page / active / parked + the listed price off the page).
    const [reg, insp] = await Promise.all([
      registrationStatus(c.domain),
      inspectSite(c.domain).catch(() => ({ site: 'error', title: null, for_sale_page: false, evidence: 'crawl failed' })),
    ]);
    let for_sale = false; let for_sale_source = null; let price = null; let currency = null; let marketplace = null; let link = null; let min_offer = null;
    // (1) Nameservers — a marketplace pair = listed now (immediate, no scan needed).
    const mkNs = marketplaceFromNs(reg.nameservers, c.domain);
    if (mkNs && !mkNs.parkingOnly) { for_sale = true; for_sale_source = 'nameserver'; marketplace = mkNs.name; link = mkNs.link; }
    // (2) Live page crawl — catches a CUSTOM "for sale" page (owner-built) or a
    // marketplace landing the NS missed, AND reads the asking price off the page.
    if (insp.for_sale_page) {
      for_sale = true; for_sale_source = for_sale_source || 'page';
      if (insp.price) { price = insp.price; currency = 'USD'; }
      // A minimum-offer floor (Spaceship "requires a minimum $X offer") — NOT a firm
      // price. Kept distinct so the UI never presents it as a buy-now.
      if (insp.min_offer && !price) { min_offer = insp.min_offer; currency = 'USD'; }
      marketplace = marketplace || insp.marketplace || null;
      link = link || insp.listing_url || null;
    }
    // Final category from the two signals.
    let category;
    if (for_sale) category = 'for_sale';
    else if (reg.status === 'available') category = 'available';
    else if (insp.site === 'active') category = 'active';
    else if (insp.site === 'parked') category = 'parked';
    // Everything else is registered — a DNS hiccup ('unknown') defaults to registered
    // (a name that answered on some path is far likelier registered than free).
    else category = 'registered';
    return {
      domain: c.domain, kind: c.kind, affix: c.affix, category, friction: c.friction || null,
      for_sale, for_sale_source, price, currency, marketplace, link, min_offer,
      status: reg.status, site: insp.site, title: insp.title || null, evidence: insp.evidence || null,
    };
  });
  // Targeted PRICE fallback — ONLY for names we found for-sale but couldn't price off
  // the page (JS-rendered Afternic/GoDaddy/Dan landers). Small + bounded.
  {
    const needPrice = results.filter((r) => r.for_sale && !(r.price > 0));
    await mapPool(needPrice, CONCURRENCY, async (r) => {
      // Afternic BIN + Sedo run in PARALLEL (independent lookups) — halves the
      // per-name latency vs sequential, which matters for a busy word's for-sale set.
      //  · Afternic BIN — the ask lives in the page JSON as micro-dollars even though
      //    the lander is JS-only. Covers Afternic + GoDaddy-brokered listings.
      //  · Sedo — the buy-now price sits behind a plain JSON endpoint. Both free.
      const [abin, sedo] = await Promise.all([afternicBin(r.domain), sedoPrice(r.domain)]);
      if (abin) {
        r.price = abin; r.currency = 'USD';
        r.marketplace = r.marketplace || 'Afternic';
        r.link = r.link || `https://www.afternic.com/domain/${r.domain}`;
        return;
      }
      if (sedo && sedo.price > 0) {
        // Buy-Now-Plus shows a floor only when it's a MEANINGFUL fraction of the
        // buy-now ceiling — a nominal $20 floor under a $49,995 ask isn't a range.
        const range = sedo.buyNowPlus && sedo.priceMin > 0 && sedo.priceMin >= sedo.price * 0.2;
        r.price = sedo.price; r.currency = sedo.currency ? sedo.currency.toUpperCase() : 'USD';
        r.price_min = range ? sedo.priceMin : null; r.price_range = range;
        r.marketplace = r.marketplace || 'Sedo';
        r.link = r.link || `https://sedo.com/search/details/?domain=${r.domain}`;
        const disp = `${sedo.symbol}${sedo.price.toLocaleString()}`;
        if (r.evidence && !/[$€£]/.test(r.evidence)) r.evidence += ` · ${range ? `${sedo.symbol}${sedo.priceMin.toLocaleString()}–` : ''}${disp}`;
        return;
      }
      if (sedo && sedo.makeOffer) {
        // Listed on Sedo but offer-only — mark it so the UI shows "Make offer", not blank.
        r.make_offer = true; r.marketplace = r.marketplace || 'Sedo';
        r.link = r.link || `https://sedo.com/search/details/?domain=${r.domain}`;
        return;
      }
      // (c) DomainScout — secondary, only for names it already monitors (track:false).
      if (!dsOn) return;
      const ds = await lookupDomain(r.domain, env, { track: false }).catch(() => null);
      const listed = ds && (ds.marketplaces || []).filter((m) => m.listed && m.price > 0);
      if (listed && listed.length) {
        const best = listed.slice().sort((a, b) => a.price - b.price)[0];
        r.price = best.price; r.currency = best.currency || 'USD';
        r.marketplace = r.marketplace || best.name || null;
        r.link = r.link || best.url || null;
        if (r.evidence && !/\$/.test(r.evidence)) r.evidence += ` · $${best.price.toLocaleString()}`;
      }
    });
  }
  // Confirm AVAILABILITY via authoritative RDAP. A DNS NS lookup that throws
  // NXDOMAIN marks a name "available", but a registered-but-undelegated name
  // (atlas.tech — taken, no active nameservers) throws the SAME error. RDAP at the
  // registry knows the difference: 'registered' → reclassify (it's NOT free).
  {
    const maybeFree = results.filter((r) => r.category === 'available');
    await mapPool(maybeFree, CONCURRENCY, async (r) => {
      const st = await rdapDomainStatus(r.domain).catch(() => 'unknown');
      if (st === 'registered') {
        r.category = 'registered'; r.status = 'registered';
        r.evidence = 'registered (RDAP) — no active nameservers, not available';
      }
    });
  }
  // Merge our internal-corpus signal onto each row. Pure signal (badges); the only
  // behavior change is filling a for-sale row's MISSING price from our stored price
  // (a name we track on e.g. Afternic the live crawl couldn't price). We never flip
  // an "available"/"active" row on stale corpus data.
  {
    // Never let a slow corpora query hold the whole response — cap the wait; if it
    // doesn't land in time we just skip the (nice-to-have) badges.
    const internal = await Promise.race([internalP, new Promise((res) => setTimeout(() => res(new Map()), 6000))]);
    for (const r of results) {
      const info = internalForRow(internal.get(r.domain.toLowerCase()));
      if (!info) continue;
      r.internal = info;
      if (r.for_sale && !(r.price > 0)) {
        const ip = info.universe_price || info.master_price;
        if (ip > 0) {
          r.price = ip; r.currency = r.currency || 'USD'; r.price_internal = true;
          r.marketplace = r.marketplace || info.universe_source || info.master_source || 'our corpus';
        }
      }
    }
  }
  // Premium / registry-reserved caveat. RDAP can't tell a registerable name from a
  // registry-RESERVED / PREMIUM one — dart.app has no registration record (looks
  // "available") but GoDaddy blocks it as a reserved dictionary word. So for
  // AVAILABLE names on premium-prone TLDs (anything but com/net/org) whose SLD is
  // short (≤5) or a dictionary word, flag `premium_risk` → the UI says "verify"
  // rather than asserting clean availability. Dictionary check is batched + fail-open.
  {
    const CLEAN_TLD = new Set(['com', 'net', 'org']);
    const risky = results.filter((r) => r.category === 'available' && !CLEAN_TLD.has(r.domain.split('.').slice(1).join('.')));
    if (risky.length) {
      const slds = [...new Set(risky.map((r) => r.domain.split('.')[0]))];
      const dict = await filterDictionaryWords(slds).catch(() => new Set());
      for (const r of risky) {
        const sld = r.domain.split('.')[0];
        if (sld.length <= 5 || dict.has(sld)) {
          r.premium_risk = true;
          r.evidence = `${r.evidence || 'available (no registration record)'} · may be premium / registry-reserved — verify at registrar`;
        }
      }
    }
    // AUTHORITATIVE pass — Porkbun checkDomain is the source of truth (avail +
    // premium + price). Rate-limited ~1/10s, so we check the flagged subset only,
    // in order, and STOP on a rate-limit signal (cache fills over runs). Confirms a
    // reserved name to registered, prices a premium, or clears the flag if it's
    // genuinely registerable. Fail-open — no keys / errors keep the heuristic.
    if (porkbunConfigured(env)) {
      for (const r of results) {
        if (!r.premium_risk) continue;
        const pk = await porkbunCheck(r.domain, env);
        if (!pk || pk.error) { if (pk && pk.rateLimited) break; continue; }
        if (!pk.available) {
          r.category = 'registered'; r.status = 'registered'; r.premium_risk = false; r.for_sale = false;
          r.evidence = 'registry-reserved / taken — not available (Porkbun)';
        } else if (pk.premium) {
          r.premium_price = pk.price || null;
          r.evidence = `available — REGISTRY PREMIUM${pk.price ? ` ~$${Math.round(pk.price).toLocaleString()}/yr` : ''} (Porkbun)`;
        } else {
          r.premium_risk = false;
          r.evidence = 'available — confirmed registerable (Porkbun)';
        }
      }
    }
  }
  results.sort((a, b) => {
    const ka = rankKey(a); const kb = rankKey(b);
    return (ka[0] - kb[0]) || (ka[1] - kb[1]) || (ka[2] - kb[2]) || a.domain.localeCompare(b.domain);
  });
  const drop = new Set((excludeTlds || []).map((t) => String(t).replace(/^\./, '').toLowerCase()));
  const criteria = {
    prefixes: (prefixes && prefixes.length ? prefixes : PREFIXES),
    suffixes: (suffixes && suffixes.length ? suffixes : SUFFIXES),
    tlds: tlds.filter((t) => !drop.has(t)),
    exclude_tlds: [...drop],
    word_aware: !!(prefixes || suffixes),
  };
  return { seed: String(seed || '').trim(), domainscout: dsOn, count: results.length, criteria, results };
}

export default { sweepVariations };
