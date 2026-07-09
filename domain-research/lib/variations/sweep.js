// Brand-variation sweep — enumerate a locked brand word's variations, then check
// each LIVE for: is it for sale (and at what price / on which marketplace) via
// DomainScout, and is it registered or available to hand-register. This is the tool
// for a client who's committed to their name and wants the domain landscape around
// it. Everything is best-effort + fail-open; a missing DomainScout key just drops
// the price column (availability still resolves via DNS).
import dns from 'node:dns/promises';
import { enumerateVariations } from './enumerate.js';
import { lookupDomain, isConfigured } from '../domainscout.js';
import { fetchText, extractClues } from '../util.js';

const CONCURRENCY = 8;
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
const MARKETPLACE_HOST_RE = /(^|\.)(dan\.com|afternic\.com|sedo\.com|atom\.com|hugedomains\.com|undeveloped\.com|efty\.com|sav\.com|above\.com|squadhelp\.com)$/i;
async function inspectSite(domain) {
  let r;
  try {
    r = await fetchText(`https://${domain}`, {}, SITE_TIMEOUT_MS);
  } catch (e) {
    // https failed — try http once (some parked/for-sale pages are http-only).
    try { r = await fetchText(`http://${domain}`, {}, SITE_TIMEOUT_MS); }
    catch { return { site: 'no_resolve', title: null, for_sale_page: false, evidence: 'site did not resolve / no response' }; }
  }
  let finalHost = '';
  try { finalHost = new URL(r.finalUrl || `https://${domain}`).host.replace(/^www\./, ''); } catch { /* ignore */ }
  const clues = extractClues(r.body || '');
  const forSaleText = clues.parking && clues.parking.for_sale_signals && clues.parking.for_sale_signals.length > 0;
  const onMarketplace = MARKETPLACE_HOST_RE.test(finalHost) || (clues.parking && clues.parking.platforms && clues.parking.platforms.length > 0);
  const parked = clues.parking && clues.parking.likely_parked;
  if (forSaleText || onMarketplace) {
    const where = MARKETPLACE_HOST_RE.test(finalHost) ? `redirects to ${finalHost}`
      : (clues.parking.platforms || [])[0] ? `${clues.parking.platforms[0]} landing page`
        : 'a custom "for sale" page';
    return { site: 'for_sale', title: clues.title, for_sale_page: true, evidence: `for-sale page — ${where}` };
  }
  if (parked) return { site: 'parked', title: clues.title, for_sale_page: false, evidence: 'parked page (no explicit for-sale text)' };
  if (r.ok && (clues.title || (clues.text_excerpt || '').length > 120)) {
    return { site: 'active', title: clues.title, for_sale_page: false, evidence: `active site${clues.title ? ` — "${clues.title}"` : ''}` };
  }
  if (r.status >= 400) return { site: 'error', title: clues.title, for_sale_page: false, evidence: `HTTP ${r.status}` };
  return { site: 'active', title: clues.title, for_sale_page: false, evidence: 'responds, minimal content' };
}

// Rank by category: for-sale first (cheapest first — the buy-ready options), then
// available-to-register, then active/parked/held; .com ahead of other TLDs.
const CATEGORY_ORDER = { for_sale: 0, available: 1, parked: 2, active: 3, registered: 4, unknown: 5 };
function rankKey(r) {
  const isCom = r.domain.endsWith('.com') ? 0 : 1;
  const price = Number.isFinite(r.price) ? r.price : Infinity;
  return [CATEGORY_ORDER[r.category] ?? 5, price, isCom];
}

// Sweep a seed word. Each candidate gets THREE independent signals — nameservers,
// DomainScout, and a live page crawl — merged into one category + for_sale flag.
// Returns { seed, domainscout, count, results:[{domain, kind, affix, category,
// for_sale, for_sale_source, price, currency, marketplace, link, site, title,
// evidence}] }.
export async function sweepVariations(seed, { env = process.env, excludeTlds = [], prefixes, suffixes } = {}) {
  const cands = enumerateVariations(seed, { excludeTlds, ...(prefixes ? { prefixes } : {}), ...(suffixes ? { suffixes } : {}) });
  const dsOn = isConfigured(env);
  const results = await mapPool(cands, CONCURRENCY, async (c) => {
    const [reg, ds, insp] = await Promise.all([
      registrationStatus(c.domain),
      dsOn ? lookupDomain(c.domain, env, { track: false }).catch(() => null) : Promise.resolve(null),
      inspectSite(c.domain).catch(() => ({ site: 'error', title: null, for_sale_page: false, evidence: 'crawl failed' })),
    ]);
    let for_sale = false; let for_sale_source = null; let price = null; let currency = null; let marketplace = null; let link = null;
    // (1) Nameservers — a marketplace pair = listed now (immediate, no scan needed).
    const mkNs = marketplaceFromNs(reg.nameservers, c.domain);
    if (mkNs && !mkNs.parkingOnly) { for_sale = true; for_sale_source = 'nameserver'; marketplace = mkNs.name; link = mkNs.link; }
    // (2) Live page crawl — catches a CUSTOM "for sale" page (owner-built) or a
    // marketplace landing the NS didn't reveal; also tells active vs parked vs dead.
    if (insp.for_sale_page) { for_sale = true; for_sale_source = for_sale_source || 'page'; }
    // (3) DomainScout — adds the PRICE (and listings on non-marketplace NS) when it
    // already monitors the name; never downgrades a confirmed listing.
    if (ds) {
      const listed = (ds.marketplaces || []).filter((m) => m.listed);
      if (listed.length) {
        const best = listed.slice().sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
        for_sale = true; for_sale_source = for_sale_source || 'domainscout';
        price = best.price ?? price; currency = best.currency || 'USD';
        marketplace = marketplace || best.name || null; link = link || best.url || null;
      } else if (ds.for_sale) { for_sale = true; for_sale_source = for_sale_source || 'domainscout'; }
    }
    // Final category from all three signals.
    let category;
    if (for_sale) category = 'for_sale';
    else if (reg.status === 'available') category = 'available';
    else if (insp.site === 'active') category = 'active';
    else if (insp.site === 'parked') category = 'parked';
    else if (reg.status === 'registered') category = 'registered';
    else category = 'unknown';
    return {
      domain: c.domain, kind: c.kind, affix: c.affix, category,
      for_sale, for_sale_source, price, currency, marketplace, link,
      status: reg.status, site: insp.site, title: insp.title || null, evidence: insp.evidence || null,
    };
  });
  results.sort((a, b) => {
    const ka = rankKey(a); const kb = rankKey(b);
    return (ka[0] - kb[0]) || (ka[1] - kb[1]) || (ka[2] - kb[2]) || a.domain.localeCompare(b.domain);
  });
  return { seed: String(seed || '').trim(), domainscout: dsOn, count: results.length, results };
}

export default { sweepVariations };
