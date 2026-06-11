// "Premium" classification for a reverse-WHOIS portfolio pull — a productionized,
// configurable version of Sam's NLTK script. The script's fixed rules were:
//   • .com only, no hyphens
//   • 2–4 char SLD  → premium (short), OR
//   • 5+ char SLD that's an English dictionary word → premium
//
// Here those rules are parameters so a run can loosen them in the UI. The
// dictionary check is delegated to a predicate the caller supplies (backed by
// the naming project's `english_words` table — see lib/db/dictionary.js), so we
// don't bundle a wordlist.

export const DEFAULT_FILTER = Object.freeze({
  tlds: ['com'],          // bare TLDs to keep; empty array = any TLD
  allowHyphens: false,
  minShort: 2,            // SLD length window that counts as premium on its own
  maxShort: 4,
  requireDictionary: true, // 5+ char SLDs must be a dictionary word to qualify
});

// Merge user options over the defaults, coercing/validating the numeric bounds.
export function normalizeFilter(opts = {}) {
  const f = { ...DEFAULT_FILTER, ...(opts || {}) };
  f.tlds = Array.isArray(f.tlds)
    ? f.tlds.map((t) => String(t).replace(/^\./, '').toLowerCase()).filter(Boolean)
    : [];
  f.allowHyphens = Boolean(f.allowHyphens);
  f.requireDictionary = Boolean(f.requireDictionary);
  f.minShort = Math.max(1, Number(f.minShort) || DEFAULT_FILTER.minShort);
  f.maxShort = Math.max(f.minShort, Number(f.maxShort) || DEFAULT_FILTER.maxShort);
  return f;
}

export function sldOf(domain) {
  const d = String(domain || '').toLowerCase().trim();
  const dot = d.indexOf('.');
  return dot > 0 ? d.slice(0, dot) : d;
}

export function tldOf(domain) {
  const d = String(domain || '').toLowerCase().trim();
  const dot = d.lastIndexOf('.');
  return dot > 0 ? d.slice(dot + 1) : '';
}

// Which SLDs in a list would need a dictionary check to qualify — i.e. the
// 5+ char alphabetic ones (the short window qualifies without the dictionary).
// Used to batch the DB lookup before classifying.
export function wordsNeedingDictionary(domains, filter = DEFAULT_FILTER) {
  const f = normalizeFilter(filter);
  if (!f.requireDictionary) return [];
  const out = new Set();
  for (const domain of domains) {
    const sld = sldOf(domain);
    if (sld.length > f.maxShort && /^[a-z]+$/.test(sld)) out.add(sld);
  }
  return [...out];
}

// Classify ONE domain. `isDictWord` is a predicate (sld → boolean); default
// treats nothing as a dictionary word (so only short names qualify, mirroring
// the script's behaviour when NLTK isn't available).
//
// Returns { premium: boolean, reason: 'short'|'dictionary'|null }.
export function classifyPremium(domain, filter = DEFAULT_FILTER, isDictWord = () => false) {
  const f = normalizeFilter(filter);
  const sld = sldOf(domain);
  const tld = tldOf(domain);

  if (!sld || !tld) return { premium: false, reason: null };
  if (f.tlds.length && !f.tlds.includes(tld)) return { premium: false, reason: null };
  if (!f.allowHyphens && sld.includes('-')) return { premium: false, reason: null };

  if (sld.length >= f.minShort && sld.length <= f.maxShort) {
    return { premium: true, reason: 'short' };
  }
  if (sld.length > f.maxShort && f.requireDictionary && /^[a-z]+$/.test(sld) && isDictWord(sld)) {
    return { premium: true, reason: 'dictionary' };
  }
  // requireDictionary OFF → any name past the short window still counts (lets a
  // run grab the whole portfolio, not just shorts/words).
  if (sld.length > f.maxShort && !f.requireDictionary) {
    return { premium: true, reason: 'kept' };
  }
  return { premium: false, reason: null };
}

// Filter + annotate a list of {domain,...} rows. Returns the premium subset,
// each row tagged with `premium_reason`, sorted shortest-SLD-first then alpha
// (the script's ordering).
export function selectPremium(rows, filter = DEFAULT_FILTER, isDictWord = () => false) {
  const out = [];
  for (const row of rows) {
    const domain = typeof row === 'string' ? row : row.domain;
    const { premium, reason } = classifyPremium(domain, filter, isDictWord);
    if (premium) out.push({ ...(typeof row === 'string' ? { domain } : row), premium_reason: reason });
  }
  out.sort((a, b) => {
    const la = sldOf(a.domain).length;
    const lb = sldOf(b.domain).length;
    return la - lb || a.domain.localeCompare(b.domain);
  });
  return out;
}
