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

// Real, delegated niche/industry gTLDs — the pool the industry-aware affix pass
// picks from when a company industry is given (dart + healthcare → dart.health,
// dart.care, dart.clinic). Kept to REAL extensions so we never enumerate a
// non-existent TLD. The picker validates its output against this set.
export const INDUSTRY_TLDS = [
  // health / medical / wellness
  'health', 'care', 'clinic', 'dental', 'doctor', 'surgery', 'vision', 'rehab', 'life', 'bio', 'fit', 'fitness', 'yoga', 'coach', 'pet', 'vet', 'dog',
  // finance / legal
  'finance', 'financial', 'money', 'fund', 'capital', 'ventures', 'tax', 'insure', 'loans', 'credit', 'cash', 'gold', 'exchange', 'markets', 'trading', 'investments', 'legal', 'lawyer', 'attorney', 'law',
  // tech / software
  'software', 'systems', 'cloud', 'digital', 'network', 'tools', 'hosting', 'codes', 'computer',
  // media / creative
  'media', 'studio', 'design', 'art', 'photography', 'film', 'music', 'fm', 'tv', 'news', 'press', 'blog', 'agency', 'marketing',
  // commerce / retail
  'shop', 'store', 'deals', 'boutique', 'fashion', 'clothing', 'shoes', 'jewelry', 'gifts',
  // food / hospitality
  'cafe', 'restaurant', 'bar', 'pizza', 'kitchen', 'recipes', 'wine', 'beer', 'coffee', 'menu', 'bakery',
  // travel / real estate / home services
  'travel', 'flights', 'tours', 'vacations', 'holiday', 'cruises', 'estate', 'homes', 'house', 'rent', 'apartments', 'land', 'build', 'construction', 'contractors', 'repair', 'plumbing', 'cleaning', 'services', 'solutions',
  // education
  'academy', 'education', 'school', 'university', 'courses', 'training', 'institute', 'science', 'engineering',
  // community / auto / green / sport
  'club', 'team', 'community', 'social', 'chat', 'dating', 'family', 'auto', 'cars', 'bike', 'green', 'eco', 'energy', 'solar', 'farm', 'garden', 'games', 'golf', 'ski', 'run',
];

// Safety cap so an exhaustive run can't fan out unbounded (the crawl is bounded by
// the endpoint's maxDuration). The word-aware prune keeps real runs well under this.
const MAX_CANDIDATES = 120;

function cleanSld(seed) {
  return String(seed || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\..*$/, '').replace(/[^a-z0-9]/g, '');
}

// Readability flags for a JUNCTION between two glyphs `a` and `b` (a prefix/suffix
// seam, or the SLD→TLD boundary). We KEEP the name but flag it — anything that hurts
// the radio test or is easy to mistype:
//   • a doubled letter (sentinel+labs → sentinellABs — "one L or two?")
//   • adjacent look-alike vertical strokes i/l/j/1 — only when CONTIGUOUS (no dot):
//     "sentinelio.com" reads as "…LIo", but "sentinel.io" is fine (the dot separates)
//   • a letter O beside a zero
//   • "rn" which reads as "m"
// Only applies to a within-SLD seam (prefix/suffix), NOT the SLD→TLD boundary — the
// dot disambiguates, so sentinel.io / sentinel.inc are clean.
const STROKE = new Set(['i', 'l', 'j', '1']);
function junctionFriction(a, b) {
  const x = String(a || '').slice(-1).toLowerCase();
  const y = String(b || '')[0]?.toLowerCase();
  if (!x || !y) return null;
  if (x === y) return `double "${x}" at the seam — reads clunky / easy to mistype`;
  if (STROKE.has(x) && STROKE.has(y)) return `"${x}${y}" — look-alike strokes (i/l/j/1), hard to read`;
  if ((x === 'o' && y === '0') || (x === '0' && y === 'o')) return `"${x}${y}" — letter "o" beside a zero, easy to confuse`;
  if (x === 'r' && y === 'n') return `"rn" can read as an "m"`;
  return null;
}
function combineFriction(...notes) {
  const list = notes.filter(Boolean);
  return list.length ? list.join('; ') : null;
}

// Enumerate the variation set for a seed word. Returns [{ domain, kind:'prefix'|
// 'suffix'|'tld', affix, friction }], .com prefix/suffix first, then the exact-word
// TLD set, de-duped. `excludeTlds` drops extensions (e.g. 'ai'). Readability-flagged
// names are INCLUDED with a `friction` note rather than dropped.
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
  for (const p of prefixes) {
    const full = `${p}${sld}`;
    add(`${full}.com`, 'prefix', p, junctionFriction(p, sld));
  }
  for (const s of suffixes) {
    const full = `${sld}${s}`;
    add(`${full}.com`, 'suffix', s, junctionFriction(sld, s));
  }
  for (const t of tlds) {
    const tld = t.toLowerCase();
    if (drop.has(tld)) continue;
    // The exact word on this TLD — no seam friction (the dot separates SLD from TLD,
    // so sentinel.io / sentinel.inc read cleanly).
    add(`${sld}.${tld}`, 'tld', tld, null);
  }
  return out;
}

export default { enumerateVariations, PREFIXES, SUFFIXES, TLDS };
