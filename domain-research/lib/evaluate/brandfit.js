// Brand-fit / connotation — how a name's MEANING affects its realizable resale value,
// on two independent axes (a refinement over a single good/bad scale):
//
//   tone    — is the word genuinely UNFAVORABLE as a brand (scam, toxic, divorce)?
//             Reuses the Admin→Import 5-point connotation scale verbatim, so the two
//             systems agree. Most names are neutral; only genuinely icky words go negative.
//   breadth — how many distinct buyer types could credibly brand on this name? A generic,
//             widely-applicable word (outline, particle, vault) is BROAD; a word locked to
//             one vertical/vibe (flirty → dating/beauty, lager → beer, poutine → food) is
//             NARROW. Narrow ≠ bad — "flirty" is a great name for the RIGHT client — but a
//             smaller buyer pool is a less liquid resale, so it clears a bit lower.
//
// The two map to a single VALUE multiplier (a tunable, inspectable lever like synergy /
// brandability / trademark). Pure mapping here; the LLM only supplies the {tone, breadth}
// labels (or the corpus connotation does, for free, when the name is already enriched).

import Anthropic from '@anthropic-ai/sdk';
import { recordModelUsage } from '../db/usage.js';

// Tone → multiplier (genuinely-unfavorable axis). Same 5-point vocab as Import enrichment.
const TONE_MULT = {
  'positive': 1.05, 'somewhat positive': 1.0, 'neutral': 1.0,
  'somewhat negative': 0.8, 'negative': 0.6,
};
// Breadth of buyer fit → multiplier. Narrow = smaller buyer pool = less liquid resale.
const BREADTH_MULT = { broad: 1.0, moderate: 0.92, narrow: 0.8 };

// brandFitMult({tone, breadth}) → a single clamped value multiplier. Defaults to 1.0 for
// anything unrecognized (so a missing/failed classification never moves the number).
export function brandFitMult({ tone, breadth } = {}) {
  const t = TONE_MULT[String(tone || '').toLowerCase()];
  const b = BREADTH_MULT[String(breadth || '').toLowerCase()];
  const mult = (t == null ? 1 : t) * (b == null ? 1 : b);
  return Math.max(0.5, Math.min(1.1, Number(mult.toFixed(3))));
}

function extractJson(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

const SYSTEM = `You judge a domain's second-level name as a brand for RESALE — would a real company build on it, and how wide is the pool of buyers who could.

Return STRICT JSON: {"tone": "...", "breadth": "...", "best_fits": ["...","..."], "note": "..."}

tone — the name's overall sentiment as a brand, EXACTLY one of: "positive", "somewhat positive", "neutral", "somewhat negative", "negative". Most names are "neutral"; reserve the negative grades for words with genuinely unfavorable associations (e.g. scam, toxic, divorce, death). A word that is merely playful, edgy, or niche is NOT negative.

breadth — how many distinct industries / buyer types could credibly brand on this name, EXACTLY one of:
  "broad" — generic and widely applicable across many sectors (e.g. outline, particle, vault, signal).
  "moderate" — fits a handful of related sectors.
  "narrow" — strongly tied to ONE vertical or vibe, so only that kind of buyer wants it (e.g. flirty → dating/beauty, lager → beer, poutine → food). Narrow is NOT bad — it's a smaller buyer pool.

best_fits — 1-3 example buyer types/verticals the name suits.
note — one short phrase explaining the breadth call.

Judge by the name's meaning and sound only. JSON only, no prose.`;

// classifyBrandFit(sld, env, corpusConnotation) → {tone, breadth, mult, best_fits[], note, source}.
// Reuses the corpus connotation (from Import enrichment) as the TONE prior when present, and
// asks the LLM for the breadth axis (+ refines tone). Fail-open: with no key / on error it
// returns the corpus tone (if any) at BROAD breadth → mult driven by tone alone (or 1.0).
export async function classifyBrandFit(sld, env = {}, corpusConnotation = null) {
  const fallbackTone = corpusConnotation && TONE_MULT[String(corpusConnotation).toLowerCase()] != null
    ? String(corpusConnotation).toLowerCase() : 'neutral';
  const fallback = { tone: fallbackTone, breadth: 'broad', best_fits: [], note: '', source: corpusConnotation ? 'corpus' : 'default' };
  if (!sld || !env.ANTHROPIC_API_KEY) return { ...fallback, mult: brandFitMult(fallback) };
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 9000, maxRetries: 1 });
    const model = env.BRANDFIT_MODEL || 'claude-haiku-4-5-20251001';
    const prior = corpusConnotation ? `\n\nOur corpus already tagged this name's tone as "${corpusConnotation}" — keep it unless clearly wrong.` : '';
    const resp = await client.messages.create({
      model, max_tokens: 200,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Name: "${sld}"${prior}\n\nClassify now. JSON only.` }],
    });
    recordModelUsage('anthropic', model, resp.usage);
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const p = extractJson(text);
    if (!p) return { ...fallback, mult: brandFitMult(fallback) };
    const tone = TONE_MULT[String(p.tone || '').toLowerCase()] != null ? String(p.tone).toLowerCase() : fallbackTone;
    const breadth = BREADTH_MULT[String(p.breadth || '').toLowerCase()] != null ? String(p.breadth).toLowerCase() : 'broad';
    const out = {
      tone, breadth,
      best_fits: Array.isArray(p.best_fits) ? p.best_fits.map((x) => String(x).trim()).filter(Boolean).slice(0, 3) : [],
      note: String(p.note || '').trim().slice(0, 160),
      source: 'llm',
    };
    return { ...out, mult: brandFitMult(out) };
  } catch {
    return { ...fallback, mult: brandFitMult(fallback) };
  }
}

export default { brandFitMult, classifyBrandFit };
