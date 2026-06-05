// Sales Research Agent — Upgrade discovery (Phase 1A).
//
// Given a domain we're selling (e.g. artificial.com), find companies that already
// use the keyword in their domain/name — the buyers who'd consolidate to the clean
// .com. Three sub-types (see SALES_RESEARCH_SPEC.md):
//   1. tld_variant — same SLD, other TLD       (artificial.ai, artificial.io)
//   2. affix       — SLD + prefix/suffix        (getartificial, artificiallabs)
//   3. name_match  — keyword in a brand name    (Artificial Labs, Artificial Lawyer)
//
// Discovery is FREE: enumerate variations × Clearbit autocomplete (name→domain,
// keyless) + direct resolution of the exact-TLD variants. No paid vendor. Each
// candidate is classified active | for_sale (parked/marketplace lander — a bad
// target) | inactive by a lightweight liveness check (the real pipeline reuses
// marketplace_check / classifyPair / livesite_inspect).
//
// Standalone:  node lib/sales/discovery/upgrade.js artificial.com

import { pathToFileURL } from 'node:url';

// Locked variation dictionaries (from the scoping doc's acceptance criteria).
export const PREFIXES = ['try', 'use', 'get', 'the', 'meet', 'open', 'hi', 'hello'];
export const SUFFIXES = ['app', 'labs', 'hub', 'hq'];
export const TLDS = ['com', 'ai', 'xyz', 'org', 'co', 'net', 'io'];

// Final-redirect hosts that mean "parked / for sale" — a domainer, not an operating
// business, so a bad outreach target. (Mirrors the Nameserver tool's generic list.)
const PARKING_HOSTS = [
  'afternic.com', 'sedo.com', 'sedoparking.com', 'dan.com', 'undeveloped.com',
  'bodis.com', 'parkingcrew.net', 'above.com', 'hugedomains.com', 'voodoo.com',
  'sav.com', 'fabulous.com', 'domainmarket.com', 'spaceship.com',
];
const FOR_SALE_RE = /\b(this domain (name )?is for sale|buy this domain|domain (name )?for sale|inquire (to|about) (buy|purchas)|make an offer|the domain .{0,40} is (available )?for sale)\b/i;

export function seedParts(domain) {
  const d = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const dot = d.lastIndexOf('.');
  return { domain: d, sld: dot > 0 ? d.slice(0, dot) : d, tld: dot > 0 ? d.slice(dot + 1) : '' };
}

// Affix variation strings for the SLD (sub-type 2 seeds for autocomplete).
export function affixVariations(sld) {
  return [...PREFIXES.map((p) => p + sld), ...SUFFIXES.map((s) => sld + s)];
}

function withTimeout(ms) {
  const c = new AbortController();
  return { signal: c.signal, cancel: setTimeout(() => c.abort(), ms) };
}

// Clearbit autocomplete: keyless name/domain → [{ name, domain }]. Best-effort.
async function autocomplete(query) {
  const t = withTimeout(12000);
  try {
    const res = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`, { signal: t.signal });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
  finally { clearTimeout(t.cancel); }
}

// Sub-types 2+3: enumerate [sld, ...affixVariations] × autocomplete, keep only
// hits that actually carry the SLD in their name or domain (drop autocomplete
// drift), dedupe by domain.
async function nameMatch(sld) {
  const queries = [sld, ...affixVariations(sld)];
  const out = new Map();
  for (const q of queries) {
    for (const c of await autocomplete(q)) {
      const domain = String(c.domain || '').toLowerCase();
      const name = String(c.name || '');
      if (!domain) continue;
      if (domain.includes(sld) || name.toLowerCase().includes(sld)) {
        if (!out.has(domain)) out.set(domain, { domain, company: name, subtype: 'name_match' });
      }
    }
  }
  return [...out.values()];
}

// Sub-type 1: the exact SLD on each target TLD.
function tldVariants(sld, seedTld) {
  return TLDS.filter((t) => t !== seedTld).map((t) => ({
    domain: `${sld}.${t}`, company: null, subtype: 'tld_variant',
  }));
}

// Lightweight status: active | for_sale | inactive.
async function classify(domain) {
  const t = withTimeout(9000);
  try {
    const res = await fetch(`https://${domain}`, { redirect: 'follow', signal: t.signal });
    let finalHost = '';
    try { finalHost = new URL(res.url).host.replace(/^www\./, ''); } catch { /* ignore */ }
    if (PARKING_HOSTS.some((h) => finalHost === h || finalHost.endsWith('.' + h))) return 'for_sale';
    const body = (await res.text()).slice(0, 6000);
    if (FOR_SALE_RE.test(body)) return 'for_sale';
    return res.ok ? 'active' : 'inactive';
  } catch { return 'inactive'; }
  finally { clearTimeout(t.cancel); }
}

// Run an async mapper over items with bounded concurrency.
async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

// Discover Upgrade candidates for a seed domain. Returns
// [{ domain, company, subtype, category:'upgrade', status }], deduped, classified.
export async function discoverUpgrade(seedDomain, { classifyStatus = true, concurrency = 8 } = {}) {
  const { sld, tld, domain: self } = seedParts(seedDomain);
  if (!sld) return [];

  const byDomain = new Map();
  for (const c of [...tldVariants(sld, tld), ...await nameMatch(sld)]) {
    if (c.domain === self) continue;                 // skip the seed itself
    const prev = byDomain.get(c.domain);
    // Prefer a name_match (carries a company name) over a bare tld_variant.
    if (!prev || (prev.subtype === 'tld_variant' && c.subtype === 'name_match')) {
      byDomain.set(c.domain, { ...prev, ...c });
    }
  }
  const candidates = [...byDomain.values()].map((c) => ({ ...c, category: 'upgrade', status: null }));

  if (classifyStatus) {
    await mapPool(candidates, concurrency, async (c) => { c.status = await classify(c.domain); });
  }
  return candidates;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seed = process.argv[2] || 'artificial.com';
  console.error(`\nUpgrade discovery for ${seed} …\n`);
  const rows = await discoverUpgrade(seed);
  const order = { active: 0, for_sale: 1, inactive: 2 };
  rows.sort((a, b) => (order[a.status] - order[b.status]) || a.domain.localeCompare(b.domain));
  const pad = (s, n) => String(s ?? '').slice(0, n).padEnd(n);
  console.log(pad('DOMAIN', 38), pad('COMPANY', 34), pad('SUBTYPE', 12), 'STATUS');
  console.log('-'.repeat(94));
  for (const r of rows) console.log(pad(r.domain, 38), pad(r.company || '—', 34), pad(r.subtype, 12), r.status);
  const n = rows.length;
  const active = rows.filter((r) => r.status === 'active').length;
  const forSale = rows.filter((r) => r.status === 'for_sale').length;
  const inactive = rows.filter((r) => r.status === 'inactive').length;
  console.log('-'.repeat(94));
  console.log(`${n} candidates · ${active} active · ${forSale} for-sale · ${inactive} inactive\n`);
}
