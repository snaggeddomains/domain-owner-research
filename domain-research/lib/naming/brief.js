import Anthropic from '@anthropic-ai/sdk';

// Free-form brief → structured filter JSON. One Haiku call per brief — cheap
// (~$0.001) and fast. Schema and prompt mirror §2.2 of the v1 spec.
const SYSTEM = `You are parsing a domain-naming brief into a JSON filter object. The downstream system queries a Postgres table of domain marketplace candidates. Return ONLY valid JSON matching this schema:

{
  "tlds": [".com"],
  "sld_length_min": 4,
  "sld_length_max": 10,
  "num_words": 1,
  "dictionary_word_only": true,
  "max_price": 5000,
  "min_quality_score": 2.5,
  "semantic_keywords": ["tech", "B2B", "saas"],
  "include_stretch": true
}

Rules:
- Always include at least ".com" in tlds.
- num_words: 1 ONLY if the brief explicitly says "one word", "single word", or "1-word only". 2 ONLY if it explicitly says "two-word only" or "exactly two words". For "one or two words", "1-2 words", "1 or 2", or anything ambiguous, return null (no constraint).
- min_quality_score: default 2.5. Bump higher (3.0+) ONLY if the brief explicitly demands a premium or top-tier feel AND num_words is 1. Two-word names typically score lower, so when num_words is 2 or null, keep min_quality_score at 2.5 or below.
- dictionary_word_only + num_words=1 together imply a very tight filter — only set both when the brief explicitly asks for a single common-English word.
- If they say "easy to spell" without specifying word count, set dictionary_word_only: true but leave num_words: null.
- If they say "premium", set max_price high (50000+). If they give a range, take the high end as max_price.
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

  const maxPriceRaw = Number(f.max_price);
  const max_price = Number.isFinite(maxPriceRaw) && maxPriceRaw > 0 ? maxPriceRaw : null;

  const mqsRaw = Number(f.min_quality_score);
  // §2.3 default is 2.5; cap at 3.0 since two-word names — which often have
  // lower zipf-derived quality scores — get effectively excluded above that.
  // The Haiku parser sometimes bumps this aggressively for "premium" briefs;
  // the cap keeps the result set populated even when the brief reads strict.
  let min_quality_score = Number.isFinite(mqsRaw) && mqsRaw >= 0 ? mqsRaw : 2.5;
  if (min_quality_score > 3.0) min_quality_score = 3.0;

  const semantic_keywords = Array.isArray(f.semantic_keywords)
    ? f.semantic_keywords.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim().toLowerCase()).slice(0, 16)
    : [];

  const include_stretch = f.include_stretch !== false; // default true

  return {
    tlds,
    sld_length_min,
    sld_length_max,
    num_words,
    dictionary_word_only,
    max_price,
    min_quality_score,
    semantic_keywords,
    include_stretch,
  };
}
