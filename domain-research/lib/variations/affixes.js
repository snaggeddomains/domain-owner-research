// Word-aware affix selection. A fixed prefix/suffix list applied blindly produces
// nonsense for many words — "goswimming" reads fine but "gobathroom" doesn't. One
// cheap Haiku call filters the candidate affixes down to the ones that sound
// natural for THIS specific word (and may add a few word-appropriate extras).
// Fail-open: no key / bad output → the full default lists.
import Anthropic from '@anthropic-ai/sdk';
import { PREFIXES, SUFFIXES } from './enumerate.js';
import { extractJsonObject } from '../naming/brief.js';
import { recordModelUsage } from '../db/usage.js';

const clean = (arr, cap) => [...new Set((Array.isArray(arr) ? arr : [])
  .map((s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
  .filter((s) => s.length >= 1 && s.length <= 12))].slice(0, cap);

export async function pickAffixes(seed, env = process.env) {
  const fallback = { prefixes: PREFIXES, suffixes: SUFFIXES };
  const word = String(seed || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\..*$/, '').replace(/[^a-z0-9]/g, '');
  if (!word || !env.ANTHROPIC_API_KEY) return fallback;
  const system = `You pick which brand-domain PREFIXES and SUFFIXES read NATURALLY for one specific word, for a startup building its domain around "${word}".

Candidate prefixes: ${PREFIXES.join(', ')}
Candidate suffixes: ${SUFFIXES.join(', ')}

Keep ONLY the affixes that sound natural and credible for "${word}". Drop any that read awkwardly for this word — e.g. for "bathroom", "gobathroom"/"usebathroom" are bad; but for "swimming", "goswimming" is fine. Judge by how the COMBINED word sounds as a startup domain.
You MAY add up to 4 NEW word-appropriate prefixes/suffixes not in the lists if they genuinely fit this word (lowercase letters only). Never create a seam with a doubled letter.
Return ONLY JSON: {"prefixes":[...],"suffixes":[...]} — each a subset (plus any additions) of natural-sounding affixes. If almost none fit, return few. No prose, no code fences.`;
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });
    const model = env.ANTHROPIC_NAMING_MODEL || 'claude-haiku-4-5-20251001';
    const resp = await client.messages.create({
      model, max_tokens: 400, system,
      messages: [{ role: 'user', content: `Word: ${word}` }],
    });
    recordModelUsage('anthropic', model, resp.usage);
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const parsed = extractJsonObject(text);
    if (!parsed) return fallback;
    const prefixes = clean(parsed.prefixes, 12);
    const suffixes = clean(parsed.suffixes, 16);
    // Guard: if the model returned nothing usable, fall back so we never emit zero
    // candidates. A very short kept-set is fine (that's the point).
    if (!prefixes.length && !suffixes.length) return fallback;
    return { prefixes, suffixes };
  } catch {
    return fallback;
  }
}

export default { pickAffixes };
