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
  "categories":   string[],                    // 1-3 from CONTROLLED LIST A
  "industries":   string[],                    // 0-5 from CONTROLLED LIST B
  "styles":       string[],                    // 0-3 from CONTROLLED LIST C
  "themes":       string[],                    // 5-15 lowercase concepts (freeform)
  "brandable":    "high" | "medium" | "low",
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
- If the SLD isn't a recognizable English word or common name, set skip_reason="non-english" (or "ambiguous" if uncertain) and keep all arrays empty.
- Be CONSERVATIVE on "brandable". "high" only when the word genuinely could anchor a real consumer or B2B brand. Inflected forms (walked, runs, running), function words (the, of, to), and stale slang are at best "low".
- Be CONSERVATIVE on "industries". Only list one when the word is genuinely associated with that vertical. "dog" is NOT "healthcare" just because dogs see vets. Empty array is correct when nothing fits.
- "themes" is where conceptual neighbors live — synonyms, evoked imagery, audience associations. This is what lets a brief about "healthcare" match "thrive" without a substring overlap. Aim for 5-15 useful concepts.
- "connotation" is your honest read of how an average brand buyer would perceive the word's vibe — not the dictionary definition alone. "criminal" is negative regardless of technical neutrality.
- Output ONLY the JSON object. No prose. No markdown code fences.

EXAMPLES:

Input: "biomedical"
Output: {"meaning":"relating to biology applied to medicine","connotation":"positive","categories":["health-medical","science"],"industries":["biotech","pharma","medical-dental","health-wellness"],"styles":["compound","one-word"],"themes":["medicine","research","biology","health","laboratory","clinical","science","wellness"],"brandable":"high","audience":["b2b","premium","professional"],"skip_reason":null,"confidence":0.92}

Input: "walked"
Output: {"meaning":"past tense of walk","connotation":"neutral","categories":["motion"],"industries":[],"styles":["one-word"],"themes":["movement","journey","past","steps"],"brandable":"low","audience":[],"skip_reason":null,"confidence":0.6}

Input: "xqzry"
Output: {"meaning":"unrecognizable letter sequence","connotation":"neutral","categories":[],"industries":[],"styles":[],"themes":[],"brandable":"low","audience":[],"skip_reason":"non-english","confidence":0.95}`;

async function enrichOne(client, model, sld) {
  const response = await client.messages.create({
    model,
    max_tokens: 700,
    system: SYSTEM,
    messages: [{ role: 'user', content: `Input: "${sld}"` }],
  });
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
  console.log(`- **categories**: ${arrOrDash(parsed.categories)}`);
  console.log(`- **industries**: ${arrOrDash(parsed.industries)}`);
  console.log(`- **styles**: ${arrOrDash(parsed.styles)}`);
  console.log(`- **themes**: ${arrOrDash(parsed.themes)}`);
  console.log(`- **audience**: ${arrOrDash(parsed.audience)}`);
  console.log(`- **skip_reason**: ${parsed.skip_reason || '—'}`);
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

  let totalInput = 0;
  let totalOutput = 0;
  const failures = [];
  for (const sld of slds) {
    process.stderr.write(`enriching ${sld}…\n`);
    try {
      const { parsed, usage } = await enrichOne(client, model, sld);
      totalInput += usage.input_tokens || 0;
      totalOutput += usage.output_tokens || 0;
      printResult(sld, parsed);
    } catch (e) {
      failures.push({ sld, error: String(e.message || e) });
      console.log(`\n## \`${sld}\`\n- **ERROR**: ${e.message || e}`);
    }
  }

  // Cost extrapolation — current Haiku 4.5 list pricing. The first call
  // includes the full system prompt; subsequent calls in this pilot don't
  // benefit from caching (no cache window between sequential CLI calls
  // unless we explicitly enable cache_control), so this is the worst-case
  // no-optimizations number per row.
  const HAIKU_INPUT_PER_M = 0.80;
  const HAIKU_OUTPUT_PER_M = 4.00;
  const inputCost = (totalInput / 1_000_000) * HAIKU_INPUT_PER_M;
  const outputCost = (totalOutput / 1_000_000) * HAIKU_OUTPUT_PER_M;
  const totalCost = inputCost + outputCost;
  const perSld = totalCost / Math.max(slds.length - failures.length, 1);

  console.log(`\n---\n## Cost`);
  console.log(`- Tokens: **${totalInput.toLocaleString()} input + ${totalOutput.toLocaleString()} output**`);
  console.log(`- Pilot cost: **$${totalCost.toFixed(4)}** at Haiku 4.5 list pricing (no caching, no batching)`);
  console.log(`- Per SLD: **$${perSld.toFixed(5)}**`);
  console.log(`\n### Scale projection (at the measured per-SLD rate above)`);
  console.log(`| Scope | Worst case (this rate) | With caching (~60%) | + Batch API (50%) |`);
  console.log(`|---|---|---|---|`);
  const scopes = [
    ['200K single-word SLDs', 200_000],
    ['500K single + good 2-word', 500_000],
    ['Full 6.27M universe', 6_270_000],
  ];
  for (const [label, n] of scopes) {
    const worst = perSld * n;
    const cached = worst * 0.4;
    const batched = cached * 0.5;
    console.log(`| ${label} | $${worst.toFixed(0)} | $${cached.toFixed(0)} | $${batched.toFixed(0)} |`);
  }

  if (failures.length) {
    console.log(`\n### Failures (${failures.length})`);
    for (const f of failures) console.log(`- \`${f.sld}\`: ${f.error}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
