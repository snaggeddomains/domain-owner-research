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
  "tlds": [".com"],
  "sld_length_min": 4,
  "sld_length_max": 10,
  "num_words": 1,
  "dictionary_word_only": true,
  "min_price": null,
  "max_price": 5000,
  "min_quality_score": 2.5,
  "semantic_keywords": ["tech", "B2B", "saas"],
  "category": "Travel & Hospitality",
  "connotation": ["positive", "somewhat positive", "neutral"],
  "exclude_domains": [],
  "exclude_inflected": false,
  "include_stretch": true
}

Rules:
- Always include at least ".com" in tlds.
- num_words: 1 ONLY if the brief explicitly says "one word", "single word", or "1-word only". 2 ONLY if it explicitly says "two-word only" or "exactly two words". For "one or two words", "1-2 words", "1 or 2", or anything ambiguous, return null (no constraint).
- min_quality_score: default 2.5. quality_score is WORD-FREQUENCY-derived, so it rewards COMMON words and penalizes rare/literary/distinctive ones. Do NOT raise it for "premium", "luxury", "elevated", "literary", "evocative", or "distinctive" briefs — those want UNCOMMON words, so a high floor excludes exactly the right candidates. For evocative/literary/luxury briefs set min_quality_score to 2.0 or LOWER (1.0 is fine). Only raise above 2.5 if the brief explicitly wants common, instantly-familiar, everyday words.
- include_stretch: default true. Set false ONLY if the brief explicitly says to show just priced / buy-ready / immediately-purchasable names. Premium, luxury, aspirational, and one-word-dictionary briefs MUST keep it true — their best candidates are usually UNPRICED north-star options that live in the Stretch bucket; disabling stretch hides them and returns nothing.
- sld_length_min / sld_length_max: leave BOTH null unless the brief explicitly constrains length ("short", "≤ 7 letters", "punchy"). A great single word can be 3-14 letters (almanac, sanctuary, chronicle, ensemble), so do NOT impose a tight max just because it's one word.
- dictionary_word_only + num_words=1 together imply a very tight filter — only set both when the brief explicitly asks for a single common-English word.
- If they say "easy to spell" without specifying word count, set dictionary_word_only: true but leave num_words: null.
- Price: set min_price / max_price ONLY from an explicit number in the brief. If the brief gives a RANGE ("$50K to $150K"), put the low end in min_price and the high end in max_price. If it gives only an upper bound ("under $5K"), set max_price only. If the brief gives NO number — including vague words like "premium", "high-end", or "luxury" — leave BOTH null (no cap): every priced name then qualifies and unpriced names fall to Stretch. Do NOT invent a ceiling from "premium".
- semantic_keywords: ENUMERATE 25-50 semantically-related terms — synonyms, adjacent concepts, sub-domains of the industry, tone-evocative roots — NOT just the literal nouns from the brief. The downstream filter matches these against each candidate's enriched keyword/industry tags AND the domain text, so on-theme terms surface names that are *about* the theme even when the word isn't in the domain. Breadth helps. For "health care startup," return roughly: health, care, medical, wellness, healthcare, clinic, therapy, patient, doctor, hospital, pharma, biotech, dental, hospice, cure, heal, vital, body, mind, fit, life, well, wellbeing, recovery, surgical, nurse, remedy, healing, holistic, fitness, organic. Aim for breadth, not exact synonyms. Lowercase, short, [a-z0-9] only. Skip generic words like "startup", "company", "brand".
- category: the SINGLE best-fit brand category, copied VERBATIM from this list (or null if genuinely unclear): ${CATEGORIES.join(', ')}. This ranks on-category enriched names higher — pick the closest even if imperfect.
- connotation: the desired brand TONE as an array of allowed grades from [${CONNOTATIONS.join(', ')}]. A premium / warm / aspirational / trustworthy brand → ["positive", "somewhat positive", "neutral"] (i.e. exclude negative). A bold/edgy brand might allow all. null if the brief gives no tone signal. Off-tone enriched names get down-ranked, so this matters for warmth/premium briefs.
- Output JSON only — no prose, no code fences.`;

export async function parseBrief(brief, env) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.ANTHROPIC_NAMING_MODEL || 'claude-haiku-4-5-20251001';
  const response = await client.messages.create({
    model,
    max_tokens: 512,
    system: SYSTEM,
    messages: [{ role: 'user', content: String(brief).slice(0, 4000) }],
  });
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
  let tlds = Array.isArray(f.tlds) ? f.tlds.filter((t) => typeof t === 'string' && t.startsWith('.')) : [];
  if (!tlds.length) tlds = ['.com'];
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

  const dictionary_word_only = Boolean(f.dictionary_word_only);

  const minPriceRaw = Number(f.min_price);
  const min_price = Number.isFinite(minPriceRaw) && minPriceRaw > 0 ? minPriceRaw : null;
  const maxPriceRaw = Number(f.max_price);
  let max_price = Number.isFinite(maxPriceRaw) && maxPriceRaw > 0 ? maxPriceRaw : null;
  // Guard against a parser that flipped the bounds — keep them ordered.
  if (min_price != null && max_price != null && max_price < min_price) max_price = null;

  const mqsRaw = Number(f.min_quality_score);
  // §2.3 default is 2.5; cap at 3.0 since two-word names — which often have
  // lower zipf-derived quality scores — get effectively excluded above that.
  // The Haiku parser sometimes bumps this aggressively for "premium" briefs;
  // the cap keeps the result set populated even when the brief reads strict.
  let min_quality_score = Number.isFinite(mqsRaw) && mqsRaw >= 0 ? mqsRaw : 2.5;
  if (min_quality_score > 3.0) min_quality_score = 3.0;

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
