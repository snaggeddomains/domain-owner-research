// Brand-variation enumerator — take a LOCKED brand word (a client who's committed
// to their name and wants domains built AROUND it) and produce the friction-clean
// candidate set: word+prefix / word+suffix on .com, plus the exact word across a
// set of credible TLDs. This is the "enumerate a specific word" job the Naming
// Exercise's theme search cannot do (it matches a corpus by theme, never holds a
// word fixed). Pure + deterministic; the live for-sale/price check is sweep.js.

// EXHAUSTIVE .com prefix/suffix sets — real startup-domain affixes, generously
// broad. The word-aware pass (lib/variations/affixes.js) prunes these to what reads
// naturally for a given word on prod; the seam guard below drops any that create a
// doubled letter (sentinel+labs → sentinellabs). We keep only genuine brand affixes
// (no junk), never hyphenated forms (hyphens fail the radio test).
export const PREFIXES = [
  'get', 'use', 'try', 'go', 'my', 'hi', 'hey', 'hello', 'join', 'the', 'with', 'we',
  'meet', 'ask', 'run', 'on', 'shop', 'book', 'find', 'build', 'make', 'start',
];
export const SUFFIXES = [
  'hq', 'app', 'labs', 'lab', 'hub', 'io', 'ai', 'os', 'api', 'now', 'go', 'base',
  'pro', 'works', 'work', 'grid', 'stack', 'flow', 'cloud', 'one', 'ify', 'ly', 'sys',
  'tech', 'group', 'ops', 'core', 'engine', 'platform', 'desk', 'kit', 'space', 'suite',
  'studio', 'central', 'wise', 'genie', 'ware', 'net', 'hub',
];

// Exact-word TLD set — TIER-1 + TIER-2 ONLY. Tier 1 = the liquid/recognized
// extensions (com/net/org + io/co/ai). Tier 2 = credible modern startup + common
// ccTLDs. Deliberately excludes tier-3 novelty/niche TLDs (.farm/.horse/.pizza/…).
// `.ai` is included by default but callers routinely exclude it (public-safety
// buyers are sensitive to "AI").
export const TLDS = ['com', 'net', 'org', 'io', 'co', 'ai', 'app', 'dev', 'tech', 'xyz', 'me', 'so', 'us', 'gg', 'inc'];

// Safety cap so an exhaustive run can't fan out unbounded (the crawl is bounded by
// the endpoint's maxDuration). The word-aware prune keeps real runs well under this.
const MAX_CANDIDATES = 120;

function cleanSld(seed) {
  return String(seed || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\..*$/, '').replace(/[^a-z0-9]/g, '');
}

// The seam between two pieces must not create a doubled letter — "sentinel"+"labs"
// A seam that repeats a letter (prefix ending == seed start, or seed end == suffix
// start) makes a doubled letter — "sentinel"+"labs" → "sentinellabs". We KEEP these
// (they're valid options) but FLAG them, since "is it one L or two?" hurts the radio
// test. Returns the friction note, or null when the seam is clean.
function seamFriction(a, b) {
  if (!a || !b) return null;
  const ch = a[a.length - 1];
  return ch === b[0] ? `double "${ch}" at the seam — reads clunky / easy to mistype` : null;
}

// Enumerate the variation set for a seed word. Returns [{ domain, kind:'prefix'|
// 'suffix'|'tld', affix, friction }], .com prefix/suffix first, then the exact-word
// TLD set, de-duped. `excludeTlds` drops extensions (e.g. 'ai'). Seam-doubled names
// are INCLUDED with a `friction` note rather than dropped.
export function enumerateVariations(seed, { excludeTlds = [], prefixes = PREFIXES, suffixes = SUFFIXES, tlds = TLDS } = {}) {
  const sld = cleanSld(seed);
  if (!sld) return [];
  const drop = new Set((excludeTlds || []).map((t) => String(t).replace(/^\./, '').toLowerCase()));
  const seen = new Set();
  const out = [];
  const add = (domain, kind, affix, friction = null) => {
    if (seen.has(domain) || out.length >= MAX_CANDIDATES) return;
    seen.add(domain);
    out.push({ domain, kind, affix, friction });
  };
  for (const p of prefixes) add(`${p}${sld}.com`, 'prefix', p, seamFriction(p, sld));
  for (const s of suffixes) add(`${sld}${s}.com`, 'suffix', s, seamFriction(sld, s));
  for (const t of tlds) { const tld = t.toLowerCase(); if (!drop.has(tld)) add(`${sld}.${tld}`, 'tld', tld); }
  return out;
}

export default { enumerateVariations, PREFIXES, SUFFIXES, TLDS };
