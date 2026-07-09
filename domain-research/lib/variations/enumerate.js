// Brand-variation enumerator — take a LOCKED brand word (a client who's committed
// to their name and wants domains built AROUND it) and produce the friction-clean
// candidate set: word+prefix / word+suffix on .com, plus the exact word across a
// set of credible TLDs. This is the "enumerate a specific word" job the Naming
// Exercise's theme search cannot do (it matches a corpus by theme, never holds a
// word fixed). Pure + deterministic; the live for-sale/price check is sweep.js.

// .com prefixes and suffixes that read as real startup domains. Ordered by how
// commonly they're used for a clean brand-adjacent domain.
export const PREFIXES = ['get', 'use', 'try', 'join', 'go', 'my', 'the'];
export const SUFFIXES = ['hq', 'app', 'hub', 'os', 'now', 'go', 'ai', 'io', 'api', 'app', 'labs', 'base', 'pro', 'works', 'grid', 'stack', 'flow', 'cloud', 'one'];

// Exact-word TLD set — .com first, then credible modern/startup extensions and the
// common ccTLDs. `.ai` is INCLUDED here by default but callers routinely exclude it
// (public-safety/gov buyers are sensitive to "AI").
export const TLDS = ['com', 'co', 'io', 'ai', 'tech', 'app', 'dev', 'xyz', 'net', 'org', 'us', 'so', 'gg', 'inc', 'live', 'life', 'world'];

function cleanSld(seed) {
  return String(seed || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\..*$/, '').replace(/[^a-z0-9]/g, '');
}

// The seam between two pieces must not create a doubled letter — "sentinel"+"labs"
// → "sentinellabs" (double-L, "is it one L or two?" friction the client flagged).
function seamOk(a, b) {
  if (!a || !b) return true;
  return a[a.length - 1] !== b[0];
}

// Enumerate the friction-clean variation set for a seed word. Returns
// [{ domain, kind:'prefix'|'suffix'|'tld', affix }], .com prefix/suffix first,
// then the exact-word TLD set, de-duped. `excludeTlds` drops extensions (e.g. 'ai').
export function enumerateVariations(seed, { excludeTlds = [], prefixes = PREFIXES, suffixes = SUFFIXES, tlds = TLDS } = {}) {
  const sld = cleanSld(seed);
  if (!sld) return [];
  const drop = new Set((excludeTlds || []).map((t) => String(t).replace(/^\./, '').toLowerCase()));
  const seen = new Set();
  const out = [];
  const add = (domain, kind, affix) => {
    if (seen.has(domain)) return;
    // never emit a seam-doubled SLD
    const s = domain.split('.')[0];
    if (/([a-z0-9])\1/.test(s) && !/([a-z0-9])\1/.test(sld)) return; // a double NOT already in the seed = a seam double
    seen.add(domain);
    out.push({ domain, kind, affix });
  };
  for (const p of prefixes) if (seamOk(p, sld)) add(`${p}${sld}.com`, 'prefix', p);
  for (const s of suffixes) if (seamOk(sld, s)) add(`${sld}${s}.com`, 'suffix', s);
  for (const t of tlds) { const tld = t.toLowerCase(); if (!drop.has(tld)) add(`${sld}.${tld}`, 'tld', tld); }
  return out;
}

export default { enumerateVariations, PREFIXES, SUFFIXES, TLDS };
