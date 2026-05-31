#!/usr/bin/env node
// Pilot script for the name_universe enrichment Phase 2 design.
// READ-ONLY — writes nothing to any database. Prints structured outputs +
// real token counts + a cost extrapolation so we can review the prompt and
// schema before committing to any scaled spend.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/enrich-sample.js
//
// Override the model:
//   ANTHROPIC_ENRICH_MODEL=claude-sonnet-4-6 node scripts/enrich-sample.js
//
// Override the SLDs (comma-separated):
//   ENRICH_SLDS=thrive,vital,heal node scripts/enrich-sample.js

import Anthropic from '@anthropic-ai/sdk';

// The 10 representative names we picked to stress-test every case the prompt
// needs to handle: clear match, semantic-only match, broad concept, inflected
// verb, negative connotation, proper noun, animal noun, fitness-adjacent,
// generic noun, and a 2-word industry term.
const DEFAULT_SLDS = [
  'biomedical', 'wellness', 'thrive', 'knowledge', 'walked',
  'criminal', 'friday', 'dog', 'strength', 'vehicle',
];

// ── Controlled list A: word-meaning categories (53) ──────────────────────
const CATEGORIES = [
  'action', 'animal', 'art', 'body', 'building', 'business', 'clothing', 'color',
  'communication', 'concept', 'container', 'drink', 'education', 'emotion', 'energy',
  'event', 'family', 'fashion', 'finance', 'food', 'geography', 'group', 'health-medical',
  'household', 'language', 'law', 'light', 'material', 'measure', 'media', 'mental-state',
  'military', 'motion', 'nature', 'object', 'people', 'place', 'plant', 'politics',
  'profession', 'quality', 'quantity', 'religion', 'science', 'shape', 'sound', 'sport',
  'technology', 'time', 'tool', 'travel', 'vehicle', 'weather',
];

// ── Controlled list B: industries (88, adapted from Atom's taxonomy) ─────
const INDUSTRIES = [
  'aerospace', 'agency-consulting', 'agriculture', 'ai-bots', 'analytics', 'automotive',
  'beauty-cosmetics', 'beer-wine-spirits', 'bikes-brand', 'biotech', 'cannabis-cbd',
  'catering', 'cleaning', 'coffee-tea', 'community-nonprofit', 'construction-architecture',
  'coworking', 'crowdfunding', 'cryptocurrency-blockchain', 'dating-relationship', 'drone',
  'e-commerce-retail', 'education-training', 'entertainment-arts', 'event-planning',
  'events-conferences', 'fashion-clothing', 'finance', 'fintech', 'fitness-gym',
  'food-delivery', 'food-drink', 'footwear', 'furniture-home', 'games-recreational',
  'gaming', 'geo-location', 'green-organic', 'health-wellness', 'home-garden', 'insurance',
  'interior-design', 'internet-of-things', 'jewelry', 'kids-baby', 'landscaping', 'legal',
  'life-coach-motivational', 'manufacturing-industrial', 'marketing-advertising',
  'medical-dental', 'metaverse', 'mobile-app', 'mortgage', 'movies-tv', 'music-audio',
  'news-media', 'nft', 'office-supplies', 'oil-gas', 'outdoor-adventure', 'payment', 'pets',
  'pharma', 'photography', 'politics-government', 'professional-services',
  'property-management', 'real-estate', 'recruitment-staffing', 'restaurants',
  'ride-sharing', 'sales-marketing', 'science-engineering', 'security', 'senior-care',
  'social-networking', 'solar-clean-energy', 'spas-salons', 'sports', 'startup-incubator',
  'storage', 'tech-software', 'transportation', 'travel-hotel', 'tutoring-test-prep',
  'venture-capital', 'video-streaming', 'virtual-reality', 'vitamins-supplements',
  'website-design', 'weddings-bridal',
];

// ── Controlled list C: styles (14, verbatim from Atom) ───────────────────
const STYLES = [
  'made-up', 'one-word', 'compound', 'alliteration', 'feminine', 'masculine',
  'animals', 'blends', 'colors', 'play-on-words', 'this-and-that', 'foreign',
  'phrases', 'misspelled',
];

const SYSTEM = `You are enriching a single domain SLD with structured brand-suitability metadata for a domain naming tool.

INPUT: a lowercase SLD (the part before .com, e.g. "thrive" or "biomedical").

OUTPUT: STRICT JSON, no prose, no fencing. Schema:

{
  "meaning":      string,                      // one-line plain English
  "connotation":  "positive" | "neutral" | "negative",
  "categories":   string[],                    // EXACTLY 1, 2, or 3 from CONTROLLED LIST A
  "industries":   string[],                    // 0-5 from CONTROLLED LIST B
  "styles":       string[],                    // 0-3 from CONTROLLED LIST C
  "themes":       string[],                    // 5-10 lowercase concepts (freeform)
  "brandable":    "high" | "medium" | "low",
  "versatility":  "open" | "broad" | "specific",
  "audience":     string[],                    // freeform: "consumer", "b2b", "premium", "playful"…
  "skip_reason":  null | "non-english" | "offensive" | "ambiguous" | "trademark-risk",
  "confidence":   number                       // 0.0-1.0
}

CONTROLLED LIST A — categories (use ONLY these values for "categories"):
${CATEGORIES.join(', ')}

CONTROLLED LIST B — industries (use ONLY these values for "industries"):
${INDUSTRIES.join(', ')}

CONTROLLED LIST C — styles (use ONLY these values for "styles"):
${STYLES.join(', ')}

RULES:

CONTROLLED-LIST DISCIPLINE (critical):
- Every value in "categories" MUST exist verbatim in LIST A. Every value in "industries" MUST exist verbatim in LIST B. Every value in "styles" MUST exist verbatim in LIST C.
- BEFORE OUTPUT, mentally verify each entry against its list. If a concept fits one list but not another (e.g. "transportation" is in INDUSTRIES but NOT CATEGORIES), use only the list where it belongs.
- "categories" must contain EXACTLY 1, 2, or 3 entries — never 4, never 0 (unless skip_reason is set).

CATEGORIES describe the word's DENOTATION (what it literally is), not its connotation. "wellness" is health-medical (what it describes); do NOT also tag it as emotion or mental-state just because it FEELS good. Reserve emotion ONLY for words that ARE emotions (joy, fear, anger, hope). Reserve mental-state ONLY for words that ARE mental states (calm, focus, clarity). An ACTION word like "thrive" (to grow) is action, not emotion. A QUALITY word like "strength" is quality/body, not emotion. If you're tempted to add emotion or mental-state because the word EVOKES a feeling, DON'T — that's connotation, not denotation.

INDUSTRIES — be CONSERVATIVE, especially for abstract words:
- For abstract concepts and broadly-applicable words (friday, knowledge, freedom, hello, alpha), "industries" should usually be EMPTY [] or have at most 1-2 entries. Only list one when a real branded product in that vertical would plausibly use this exact word — not just any product that might mention it.
- "knowledge" is NOT tech-software just because software stores knowledge. "friday" is NOT entertainment-arts just because Fridays are fun.
- "dog" is NOT health-medical just because dogs see vets. Empty array is the right answer for most words.

VERSATILITY describes how flexibly the word could anchor a brand across UNRELATED industries:
- "open" — could anchor a brand in many unrelated industries (friday, thrive, alpha, max, vibe). A brand-buyer could put this word on a tech app, a fashion line, a restaurant, or a VC firm — all believable. These usually have empty or near-empty industries arrays.
- "broad" — could anchor several RELATED industries (wellness fits health, fitness, beauty, spa; strength fits fitness, sports, motivation). Industries array typically has 2-4 related entries.
- "specific" — locked to one or two narrow industries (biomedical → medical/bio; mortgage → finance; jersey → fashion/sports). Industries array typically has 1-2 entries from the same domain.
- When brandable is "low" (inflected forms, function words), versatility should usually be "specific" or copy whatever industry context exists.

STYLES — "one-word" means the SLD is a single English dictionary word. "compound" means two roots joined ("biomedical", "cardiovascular"). These are NOT mutually exclusive — biomedical is both. Apply both when both fit.

BRANDABLE — be CONSERVATIVE. "high" only when the word genuinely could anchor a real consumer or B2B brand. Inflected forms (walked, runs, running), function words (the, of, to), and stale slang are at best "low".

THEMES is where conceptual neighbors live — synonyms, evoked imagery, audience associations. This is what lets a brief about "healthcare" match "thrive" without a substring overlap. Aim for 5-10 useful concepts (quality over quantity — the first 5-8 carry most of the signal).

CONNOTATION is your honest read of how an average brand buyer would perceive the word's vibe — not the dictionary definition alone. "criminal" is negative regardless of technical neutrality.

SKIP — if the SLD isn't a recognizable English word or common name, set skip_reason="non-english" (or "ambiguous" if uncertain) and keep all arrays empty.

OUTPUT ONLY the JSON object. No prose. No markdown code fences.

EXAMPLES:

Input: "biomedical"
Output: {"meaning":"relating to biology applied to medicine","connotation":"positive","categories":["health-medical","science"],"industries":["biotech","pharma","medical-dental"],"styles":["one-word","compound"],"themes":["medicine","research","biology","health","laboratory","clinical","science","wellness"],"brandable":"high","versatility":"specific","audience":["b2b","premium","professional"],"skip_reason":null,"confidence":0.92}

Input: "friday"
Output: {"meaning":"the sixth day of the week","connotation":"positive","categories":["time"],"industries":[],"styles":["one-word"],"themes":["weekend","leisure","celebration","social","relaxation","fun","anticipation","relief"],"brandable":"high","versatility":"open","audience":["consumer","playful","social"],"skip_reason":null,"confidence":0.9}

Input: "walked"
Output: {"meaning":"past tense of walk","connotation":"neutral","categories":["motion"],"industries":[],"styles":["one-word"],"themes":["movement","journey","past","steps"],"brandable":"low","versatility":"specific","audience":[],"skip_reason":null,"confidence":0.6}

Input: "xqzry"
Output: {"meaning":"unrecognizable letter sequence","connotation":"neutral","categories":[],"industries":[],"styles":[],"themes":[],"brandable":"low","versatility":"specific","audience":[],"skip_reason":"non-english","confidence":0.95}

Input: "zen"
Output: {"meaning":"a state of calm meditative awareness, from Japanese Buddhism","connotation":"positive","categories":["mental-state","religion"],"industries":["life-coach-motivational","health-wellness","spas-salons"],"styles":["one-word","foreign"],"themes":["calm","peace","meditation","focus","balance","mindfulness","tranquility","clarity"],"brandable":"high","versatility":"broad","audience":["consumer","premium","lifestyle"],"skip_reason":null,"confidence":0.9}

Input: "kavu"
Output: {"meaning":"a made-up phonetic word with no standard English meaning","connotation":"neutral","categories":["concept"],"industries":[],"styles":["made-up","one-word"],"themes":["coined","brandable","invented","syllabic","memorable"],"brandable":"medium","versatility":"open","audience":["consumer","playful"],"skip_reason":null,"confidence":0.65}`;

async function enrichOne(client, model, sld, debugFirstResponse = false) {
  // Use the beta messages endpoint (client.beta.messages) — even though
  // cache_control is typed on the standard endpoint in SDK 0.99.0, empirical
  // result is that the standard endpoint silently drops it (round 3-4 saw
  // cache_creation/read both 0). The beta endpoint is documented to support
  // prompt caching reliably and is what Anthropic's own examples use.
  const response = await client.beta.messages.create({
    model,
    max_tokens: 700,
    system: [
      { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: `Input: "${sld}"` }],
  });
  // One-shot diagnostic on the very first call so we can see what Anthropic
  // is actually reporting back — if cache fields are missing entirely vs
  // present-but-zero, that tells us where the failure is.
  if (debugFirstResponse) {
    process.stderr.write(`[debug] first response usage keys: ${JSON.stringify(response.usage)}\n`);
  }
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`Non-JSON output for "${sld}": ${text.slice(0, 300)}`);
  }
  return { parsed, usage: response.usage, raw: text };
}

function arrOrDash(v) {
  if (!Array.isArray(v) || !v.length) return '—';
  return v.join(', ');
}

function printResult(sld, parsed) {
  console.log(`\n## \`${sld}\``);
  console.log(`- **meaning**: ${parsed.meaning || '—'}`);
  console.log(`- **connotation**: ${parsed.connotation || '—'}`);
  console.log(`- **brandable**: ${parsed.brandable || '—'} (confidence ${parsed.confidence ?? '—'})`);
  console.log(`- **versatility**: ${parsed.versatility || '—'}`);
  console.log(`- **categories**: ${arrOrDash(parsed.categories)}`);
  console.log(`- **industries**: ${arrOrDash(parsed.industries)}`);
  console.log(`- **styles**: ${arrOrDash(parsed.styles)}`);
  console.log(`- **themes**: ${arrOrDash(parsed.themes)}`);
  console.log(`- **audience**: ${arrOrDash(parsed.audience)}`);
  console.log(`- **skip_reason**: ${parsed.skip_reason || '—'}`);
  // Surface controlled-list violations inline so they show up loud in the
  // pilot review — this is the failure mode we explicitly tightened against.
  const catBad = (parsed.categories || []).filter((c) => !CATEGORIES.includes(c));
  const indBad = (parsed.industries || []).filter((i) => !INDUSTRIES.includes(i));
  const stylesBad = (parsed.styles || []).filter((s) => !STYLES.includes(s));
  const catCount = (parsed.categories || []).length;
  const issues = [];
  if (catBad.length) issues.push(`categories not in list: ${catBad.join(', ')}`);
  if (indBad.length) issues.push(`industries not in list: ${indBad.join(', ')}`);
  if (stylesBad.length) issues.push(`styles not in list: ${stylesBad.join(', ')}`);
  if (parsed.skip_reason == null && (catCount < 1 || catCount > 3)) issues.push(`categories count = ${catCount} (must be 1-3)`);
  if (issues.length) console.log(`- **⚠ violations**: ${issues.join(' · ')}`);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY env var.');
    process.exit(1);
  }
  const model = process.env.ANTHROPIC_ENRICH_MODEL || 'claude-haiku-4-5-20251001';
  const slds = process.env.ENRICH_SLDS
    ? process.env.ENRICH_SLDS.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_SLDS;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`# Enrichment pilot — ${slds.length} SLDs`);
  console.log(`\n**Model**: \`${model}\` · **Schema axes**: categories (${CATEGORIES.length}), industries (${INDUSTRIES.length}), styles (${STYLES.length})`);

  let totalUncachedInput = 0; // fresh input (non-cached)
  let totalCacheCreate = 0;   // first call writes the cache (1.25× input)
  let totalCacheRead = 0;     // subsequent calls hit the cache (0.10× input)
  let totalOutput = 0;
  let cacheHits = 0;          // measured, not assumed — counts calls where cache_read > 0
  let cacheWrites = 0;        // counts calls where cache_creation > 0
  const failures = [];
  for (let i = 0; i < slds.length; i++) {
    const sld = slds[i];
    process.stderr.write(`enriching ${sld}…\n`);
    try {
      const { parsed, usage } = await enrichOne(client, model, sld, i === 0);
      // usage.input_tokens reports only the FRESH (uncached) input. Cache
      // hits/writes are reported separately and don't double-count.
      totalUncachedInput += usage.input_tokens || 0;
      totalCacheCreate += usage.cache_creation_input_tokens || 0;
      totalCacheRead += usage.cache_read_input_tokens || 0;
      totalOutput += usage.output_tokens || 0;
      if ((usage.cache_read_input_tokens || 0) > 0) cacheHits++;
      if ((usage.cache_creation_input_tokens || 0) > 0) cacheWrites++;
      printResult(sld, parsed);
    } catch (e) {
      failures.push({ sld, error: String(e.message || e) });
      console.log(`\n## \`${sld}\`\n- **ERROR**: ${e.message || e}`);
    }
  }

  // Haiku 4.5 list pricing per million tokens (Anthropic).
  // Cache writes are billed at 1.25× the base input rate;
  // cache reads at 0.10× (the 90%-off discount).
  const HAIKU_INPUT_PER_M = 0.80;
  const HAIKU_OUTPUT_PER_M = 4.00;
  const CACHE_WRITE_MULT = 1.25;
  const CACHE_READ_MULT = 0.10;
  const uncachedInputCost = (totalUncachedInput / 1_000_000) * HAIKU_INPUT_PER_M;
  const cacheWriteCost = (totalCacheCreate / 1_000_000) * HAIKU_INPUT_PER_M * CACHE_WRITE_MULT;
  const cacheReadCost = (totalCacheRead / 1_000_000) * HAIKU_INPUT_PER_M * CACHE_READ_MULT;
  const outputCost = (totalOutput / 1_000_000) * HAIKU_OUTPUT_PER_M;
  const totalCost = uncachedInputCost + cacheWriteCost + cacheReadCost + outputCost;
  const perSld = totalCost / Math.max(slds.length - failures.length, 1);
  const cacheRate = (cacheHits / Math.max(slds.length, 1)) * 100;
  const cachingWorking = cacheHits > 0 || cacheWrites > 0;

  console.log(`\n---\n## Cost`);
  console.log(`- Tokens:`);
  console.log(`  - fresh input: **${totalUncachedInput.toLocaleString()}**`);
  console.log(`  - cache writes: **${totalCacheCreate.toLocaleString()}** (1.25× input rate)`);
  console.log(`  - cache reads: **${totalCacheRead.toLocaleString()}** (0.10× input rate — the win)`);
  console.log(`  - output: **${totalOutput.toLocaleString()}**`);
  console.log(`- Cache effectiveness: **${cacheHits}/${slds.length} calls hit (${cacheRate.toFixed(0)}%)**${cachingWorking ? '' : ' — ⚠ caching NOT firing, prompt likely under model minimum (Haiku 4.5 needs ≥2048 cached tokens)'}`);
  console.log(`- Pilot cost: **$${totalCost.toFixed(4)}** at Haiku 4.5 list pricing (caching ON)`);
  console.log(`- Per SLD: **$${perSld.toFixed(5)}**`);
  console.log(`\n### Scale projection (at the measured per-SLD rate above)`);
  console.log(`| Scope | This rate (caching ON) | + Batch API (50% off)¹ |`);
  console.log(`|---|---|---|`);
  const scopes = [
    ['200K single-word SLDs', 200_000],
    ['500K single + good 2-word', 500_000],
    ['Full 6.27M universe', 6_270_000],
  ];
  for (const [label, n] of scopes) {
    const cached = perSld * n;
    const batched = cached * 0.5;
    console.log(`| ${label} | $${cached.toFixed(0)} | $${batched.toFixed(0)} |`);
  }
  console.log(`\n¹ Batch API gives 50% off but its 24h processing window typically defeats the 5-minute cache TTL — so in practice you pick ONE optimization, not both.`);

  if (failures.length) {
    console.log(`\n### Failures (${failures.length})`);
    for (const f of failures) console.log(`- \`${f.sld}\`: ${f.error}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
