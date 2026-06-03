import Anthropic from '@anthropic-ai/sdk';

// Free-form brief → structured filter JSON. One Haiku call per brief — cheap
// (~$0.001) and fast. Schema and prompt mirror §2.2 of the v1 spec.

// Controlled enrichment vocab (mirrors tools/enrich.py). category/connotation
// from the brief are used to RANK candidates (not hard-filter), so they nudge
// on-category, on-tone enriched names up without excluding unenriched rows.
const CATEGORIES = [
  'Technology & Software', 'Internet & Web', 'AI & Data', 'Finance & Fintech',
  'Crypto & Web3', 'E-Commerce & Retail', 'Business & Professional',
  'Marketing & Advertising', 'Media & Publishing', 'Entertainment & Gaming',
  'Social & Community', 'Education & Learning', 'Health & Wellness',
  'Medical & Biotech', 'Food & Drink', 'Travel & Hospitality',
  'Real Estate & Property', 'Home & Living', 'Fashion & Beauty',
  'Sports & Fitness', 'Automotive & Transport', 'Energy & Environment',
  'Legal & Government', 'Nonprofit & Causes', 'Family & Parenting',
  'Arts & Design', 'Science & Research', 'Pets & Animals',
  'Dating & Relationships', 'Lifestyle', 'General & Other',
];
const CATEGORY_SET = new Set(CATEGORIES.map((c) => c.toLowerCase()));
const CONNOTATIONS = ['positive', 'somewhat positive', 'neutral', 'somewhat negative', 'negative'];
const CONNOTATION_SET = new Set(CONNOTATIONS);

const SYSTEM = `You are parsing a domain-naming brief into a JSON filter object. The downstream system queries a Postgres table of domain marketplace candidates. Return ONLY valid JSON matching this schema:

{
  "tlds": [],
  "sld_length_min": null,
  "sld_length_max": null,
  "num_words": null,
  "num_words_min": null,
  "num_words_max": null,
  "dictionary_word_only": false,
  "min_price": null,
  "max_price": null,
  "min_quality_score": null,
  "semantic_keywords": ["..."],
  "category": null,
  "connotation": null,
  "exclude_domains": [],
  "exclude_inflected": false,
  "include_stretch": true
}

CORE PRINCIPLE — DEFAULT BROAD. Every numeric/categorical filter above defaults to null (no constraint). Set a filter ONLY when the brief EXPLICITLY specifies it. Unrequested filters silently shrink the result set; when in doubt, return too many names, not too few. Length, price, quality floor, num_words, dictionary-only, connotation, and category are all OFF unless the brief asks for them.

Rules:
- tlds: include ONLY the TLDs the brief explicitly names (e.g. ".com only" → [".com"]; ".io or .ai" → [".io",".ai"]). If the brief says nothing about TLD, return [] (empty = no TLD constraint; the UI defaults to All).
- num_words / num_words_min / num_words_max — word-count constraints; ALL default null. Use these:
  - Exact count: num_words=1 ONLY for "one word"/"single word"/"1-word only"; num_words=2 ONLY for "two-word only"/"exactly two words".
  - Maximum ("one to two words", "1-2 words", "one or two words", "up to two words", "two words or fewer", "no more than two words", "at most N words", "one to N words"): set num_words_max to the upper bound (e.g. 2) and leave num_words AND num_words_min null. A lower bound of "one"/1 means NO minimum — just the max.
  - Minimum ("at least two words", "two or more words"): set num_words_min. A true span like "two to three words" → num_words_min=2 AND num_words_max=3.
  - Say nothing about word count → leave all three null.
- min_quality_score: default NULL (no floor) — results are already ordered best-first, so a floor only trims names. quality_score is WORD-FREQUENCY-derived, so it rewards COMMON words and penalizes rare/literary ones; NEVER raise it for "premium"/"luxury"/"literary"/"evocative" (those want uncommon words). Set a floor ONLY if the brief explicitly wants common, instantly-familiar, everyday words — and even then keep it ≤ 2.5.
- include_stretch: default true. Set false ONLY if the brief explicitly says to show just priced / buy-ready / immediately-purchasable names. Premium, luxury, aspirational, and one-word-dictionary briefs MUST keep it true — their best candidates are usually UNPRICED north-star options that live in the Stretch bucket; disabling stretch hides them and returns nothing.
- sld_length_min / sld_length_max: leave BOTH null unless the brief explicitly constrains length ("short", "≤ 7 letters", "punchy"). A great single word can be 3-14 letters (almanac, sanctuary, chronicle, ensemble), so do NOT impose a tight max just because it's one word.
- dictionary_word_only + num_words=1 together imply a very tight filter — only set both when the brief explicitly asks for a single common-English word.
- If they say "easy to spell" without specifying word count, set dictionary_word_only: true but leave num_words: null.
- Price: set min_price / max_price ONLY from an explicit number in the brief. If the brief gives a RANGE ("$50K to $150K"), put the low end in min_price and the high end in max_price. If it gives only an upper bound ("under $5K"), set max_price only. If the brief gives NO number — including vague words like "premium", "high-end", or "luxury" — leave BOTH null (no cap): every priced name then qualifies and unpriced names fall to Stretch. Do NOT invent a ceiling from "premium".
- semantic_keywords: ENUMERATE 25-50 semantically-related terms — synonyms, adjacent concepts, sub-domains of the industry, tone-evocative roots — NOT just the literal nouns from the brief. The downstream filter matches these against each candidate's enriched keyword/industry tags AND the domain text, so on-theme terms surface names that are *about* the theme even when the word isn't in the domain. Breadth helps. For "health care startup," return roughly: health, care, medical, wellness, healthcare, clinic, therapy, patient, doctor, hospital, pharma, biotech, dental, hospice, cure, heal, vital, body, mind, fit, life, well, wellbeing, recovery, surgical, nurse, remedy, healing, holistic, fitness, organic. Aim for breadth, not exact synonyms. Lowercase, short, [a-z0-9] only. Skip generic words like "startup", "company", "brand".
- category: set ONLY if the brief clearly names an industry/theme; then copy the SINGLE best-fit label VERBATIM from this list, else null: ${CATEGORIES.join(', ')}. It only ranks on-category enriched names higher (a soft boost), so null is fine when unsure.
- connotation: set ONLY if the brief explicitly states a desired emotional tone (e.g. "warm", "trustworthy", "playful", "bold"); then return the allowed grades from [${CONNOTATIONS.join(', ')}] (warm/positive → ["positive", "somewhat positive", "neutral"]). Otherwise null. Users can also set this directly via the on-screen control, so default null unless the brief is explicit about tone.
- Output JSON only — no prose, no code fences.`;

// Retry transient Anthropic failures (503 overloaded_error, 429 rate limit,
// 500/502/529, network blips) with exponential backoff + jitter. A single 503
// on the brief-parse call otherwise hard-fails the whole search ("Couldn't
// parse your brief: 503 ...overloaded..."), which is exactly the kind of
// momentary platform hiccup a couple of retries ride through.
async function callWithRetry(fn, { tries = 5, baseMs = 600 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const status = e && (e.status ?? e.statusCode);
      const msg = String((e && e.message) || e);
      const transient = [408, 409, 425, 429, 500, 502, 503, 504, 529].includes(status)
        || /overloaded|temporarily unavailable|rate.?limit|timed?.?out|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed/i.test(msg);
      if (!transient || attempt === tries - 1) break;
      const delay = baseMs * 2 ** attempt + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export async function parseBrief(brief, env) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  // maxRetries:0 — we own the retry loop below (callWithRetry) so backoff timing
  // is explicit and covers overloaded_error, which the SDK doesn't always retry.
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 0 });
  const model = env.ANTHROPIC_NAMING_MODEL || 'claude-haiku-4-5-20251001';
  let response;
  try {
    response = await callWithRetry(() => client.messages.create({
      model,
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: 'user', content: String(brief).slice(0, 4000) }],
    }));
  } catch (e) {
    const status = e && (e.status ?? e.statusCode);
    const msg = String((e && e.message) || e);
    if ([429, 500, 502, 503, 504, 529].includes(status) || /overloaded|temporarily unavailable/i.test(msg)) {
      throw new Error('The naming model is briefly overloaded (Anthropic). Click Find Names again in a few seconds.');
    }
    throw e;
  }
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  // Strip a leading code fence if the model added one despite the instruction.
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`Could not parse brief — model returned non-JSON: ${text.slice(0, 200)}`);
  }
  return validateFilters(parsed);
}

// Clamp / coerce to safe values before letting the SQL builder see them. Spec
// §2.3 — TLDs non-empty, sld lengths in [2,14], price positive or null, etc.
export function validateFilters(raw) {
  const f = raw && typeof raw === 'object' ? raw : {};
  // Only the TLDs the brief explicitly named; empty = no TLD constraint (all).
  // The UI dropdown defaults to All and can narrow; do NOT force .com here.
  let tlds = Array.isArray(f.tlds) ? f.tlds.filter((t) => typeof t === 'string' && t.startsWith('.')) : [];
  tlds = [...new Set(tlds.map((t) => t.toLowerCase()))].slice(0, 8);

  const clampLen = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(2, Math.min(14, Math.round(n)));
  };
  const sld_length_min = f.sld_length_min == null ? null : clampLen(f.sld_length_min);
  const sld_length_max = f.sld_length_max == null ? null : clampLen(f.sld_length_max);

  const numWordsRaw = Number(f.num_words);
  const num_words = numWordsRaw === 1 || numWordsRaw === 2 ? numWordsRaw : null;
  const clampWords = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(1, Math.min(6, Math.round(n)));
  };
  const num_words_min = f.num_words_min == null ? null : clampWords(f.num_words_min);
  let num_words_max = f.num_words_max == null ? null : clampWords(f.num_words_max);
  // Keep bounds ordered if the parser flipped them.
  if (num_words_min != null && num_words_max != null && num_words_max < num_words_min) num_words_max = null;

  const dictionary_word_only = Boolean(f.dictionary_word_only);

  const minPriceRaw = Number(f.min_price);
  const min_price = Number.isFinite(minPriceRaw) && minPriceRaw > 0 ? minPriceRaw : null;
  const maxPriceRaw = Number(f.max_price);
  let max_price = Number.isFinite(maxPriceRaw) && maxPriceRaw > 0 ? maxPriceRaw : null;
  // Guard against a parser that flipped the bounds — keep them ordered.
  if (min_price != null && max_price != null && max_price < min_price) max_price = null;

  // Default NULL (no floor) — "default broad": a floor only trims names, and the
  // results are already ordered best-first. Only honor a floor the parser set
  // from an explicit brief signal; cap it at 3.0 so it can never be over-tight.
  // Strictly > 0: a floor of 0 is a no-op as a threshold but, applied as SQL
  // `quality_score >= 0`, it silently EXCLUDES null-quality rows (coined /
  // brandable names — prime buy-ready inventory). Treat 0 (or negative) as
  // "no floor" so those names aren't dropped.
  const mqsRaw = Number(f.min_quality_score);
  let min_quality_score = Number.isFinite(mqsRaw) && mqsRaw > 0 ? mqsRaw : null;
  if (min_quality_score != null && min_quality_score > 3.0) min_quality_score = 3.0;

  const semantic_keywords = Array.isArray(f.semantic_keywords)
    ? f.semantic_keywords.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim().toLowerCase()).slice(0, 50)
    : [];

  // exclude_domains: precise per-domain blocklist for chat-driven "drop X.com"
  // refinements. Sanitized to safe domain characters before going into the
  // PostgREST .not('in', ...) clause — anything weird is dropped silently.
  const exclude_domains = Array.isArray(f.exclude_domains)
    ? [...new Set(f.exclude_domains
        .map((d) => String(d || '').toLowerCase().trim())
        .filter((d) => /^[a-z0-9][a-z0-9.-]{0,252}$/.test(d)))]
        .slice(0, 200)
    : [];

  const exclude_inflected = Boolean(f.exclude_inflected);
  const include_stretch = f.include_stretch !== false; // default true

  // Ranking signals (not filters). category must match the controlled vocab;
  // connotation is the subset of grades to prefer (off-list grades dropped).
  const catRaw = typeof f.category === 'string' ? f.category.trim() : '';
  const category = catRaw && CATEGORY_SET.has(catRaw.toLowerCase())
    ? CATEGORIES.find((c) => c.toLowerCase() === catRaw.toLowerCase())
    : null;
  const connotation = Array.isArray(f.connotation)
    ? [...new Set(f.connotation.map((c) => String(c || '').trim().toLowerCase()).filter((c) => CONNOTATION_SET.has(c)))]
    : null;

  return {
    tlds,
    sld_length_min,
    sld_length_max,
    num_words,
    num_words_min,
    num_words_max,
    dictionary_word_only,
    min_price,
    max_price,
    min_quality_score,
    semantic_keywords,
    category,
    connotation: connotation && connotation.length ? connotation : null,
    exclude_domains,
    exclude_inflected,
    include_stretch,
  };
}
