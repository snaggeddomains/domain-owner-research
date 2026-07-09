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

// Registered vs available — a name that resolves NS is registered. NXDOMAIN /
// ENOTFOUND ⇒ available to hand-register. Anything else ⇒ unknown (don't claim
// available). ccTLDs answer here even when RDAP bootstrap misses them.
async function registrationStatus(domain) {
  try {
    const ns = await dns.resolveNs(domain);
    return ns && ns.length ? 'registered' : 'registered';
  } catch (e) {
    const code = e && e.code;
    if (code === 'ENOTFOUND' || code === 'NXDOMAIN') return 'available';
    if (code === 'ENODATA') return 'registered'; // exists, just no NS at this label
    return 'unknown';
  }
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
    const [status, ds] = await Promise.all([
      registrationStatus(c.domain),
      dsOn ? lookupDomain(c.domain, env, { track: false }).catch(() => null) : Promise.resolve(null),
    ]);
    let for_sale = false; let price = null; let currency = null; let marketplace = null; let link = null;
    if (ds) {
      const listed = (ds.marketplaces || []).filter((m) => m.listed);
      if (listed.length) {
        const best = listed.slice().sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
        for_sale = true; price = best.price ?? null; currency = best.currency || 'USD';
        marketplace = best.name || null; link = best.url || null;
      } else if (ds.for_sale) {
        for_sale = true;
      }
    }
    return { domain: c.domain, kind: c.kind, affix: c.affix, status, for_sale, price, currency, marketplace, link };
  });
  results.sort((a, b) => {
    const ka = rankKey(a); const kb = rankKey(b);
    return (ka[0] - kb[0]) || (ka[1] - kb[1]) || (ka[2] - kb[2]) || a.domain.localeCompare(b.domain);
  });
  return { seed: String(seed || '').trim(), domainscout: dsOn, count: results.length, results };
}

export default { sweepVariations };
