// Brand-variation sweep — enumerate a locked brand word's variations, then check
// each LIVE for: is it for sale (and at what price / on which marketplace) via
// DomainScout, and is it registered or available to hand-register. This is the tool
// for a client who's committed to their name and wants the domain landscape around
// it. Everything is best-effort + fail-open; a missing DomainScout key just drops
// the price column (availability still resolves via DNS).
import dns from 'node:dns/promises';
import { enumerateVariations } from './enumerate.js';
import { lookupDomain, isConfigured } from '../domainscout.js';

const CONCURRENCY = 6;

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

// Rank: for-sale first (cheapest first — the buy-ready options), then available-to-
// register, then registered/held; .com ahead of other TLDs within a tier.
function rankKey(r) {
  const tier = r.for_sale ? 0 : r.status === 'available' ? 1 : 2;
  const isCom = r.domain.endsWith('.com') ? 0 : 1;
  const price = Number.isFinite(r.price) ? r.price : Infinity;
  return [tier, price, isCom];
}

// Sweep a seed word. Returns { seed, domainscout, count, results:[{domain, kind,
// affix, status, for_sale, price, currency, marketplace, link}] }.
export async function sweepVariations(seed, { env = process.env, excludeTlds = [] } = {}) {
  const cands = enumerateVariations(seed, { excludeTlds });
  const dsOn = isConfigured(env);
  const results = await mapPool(cands, CONCURRENCY, async (c) => {
    const [reg, ds] = await Promise.all([
      registrationStatus(c.domain),
      dsOn ? lookupDomain(c.domain, env, { track: false }).catch(() => null) : Promise.resolve(null),
    ]);
    let for_sale = false; let price = null; let currency = null; let marketplace = null; let link = null;
    // (1) Immediate signal from the nameservers — a marketplace pair = listed now.
    const mkNs = marketplaceFromNs(reg.nameservers, c.domain);
    if (mkNs && !mkNs.parkingOnly) { for_sale = true; marketplace = mkNs.name; link = mkNs.link; }
    // (2) DomainScout adds the PRICE (and catches listings on non-marketplace NS)
    // when it has the domain; it never downgrades a nameserver-confirmed listing.
    if (ds) {
      const listed = (ds.marketplaces || []).filter((m) => m.listed);
      if (listed.length) {
        const best = listed.slice().sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
        for_sale = true; price = best.price ?? price; currency = best.currency || 'USD';
        marketplace = marketplace || best.name || null; link = link || best.url || null;
      } else if (ds.for_sale) {
        for_sale = true;
      }
    }
    return { domain: c.domain, kind: c.kind, affix: c.affix, status: reg.status, for_sale, price, currency, marketplace, link };
  });
  results.sort((a, b) => {
    const ka = rankKey(a); const kb = rankKey(b);
    return (ka[0] - kb[0]) || (ka[1] - kb[1]) || (ka[2] - kb[2]) || a.domain.localeCompare(b.domain);
  });
  return { seed: String(seed || '').trim(), domainscout: dsOn, count: results.length, results };
}

export default { sweepVariations };
