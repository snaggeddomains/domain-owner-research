// Word-aware affix selection. A fixed prefix/suffix list applied blindly produces
// nonsense for many words — "goswimming" reads fine but "gobathroom" doesn't. One
// cheap Haiku call filters the candidate affixes down to the ones that sound
// natural for THIS specific word (and may add a few word-appropriate extras).
// Fail-open: no key / bad output → the full default lists.
import Anthropic from '@anthropic-ai/sdk';
import { PREFIXES, SUFFIXES, INDUSTRY_TLDS } from './enumerate.js';
import { extractJsonObject } from '../naming/brief.js';
import { recordModelUsage } from '../db/usage.js';

const clean = (arr, cap) => [...new Set((Array.isArray(arr) ? arr : [])
  .map((s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
  .filter((s) => s.length >= 1 && s.length <= 12))].slice(0, cap);

// Word-aware (and optionally INDUSTRY-aware) affix selection. When `industry` is
// given, the picker ALSO proposes industry-relevant prefixes/suffixes (healthcare
// → health/care/med) and picks fitting REAL niche TLDs from INDUSTRY_TLDS
// (dart.health/.care/.clinic). TLDs are validated against the pool so a
// hallucinated extension can't leak in. Returns { prefixes, suffixes, tlds };
// tlds is [] unless an industry is given. Fail-open to the defaults.
export async function pickAffixes(seed, env = process.env, { industry = '' } = {}) {
  const fallback = { prefixes: PREFIXES, suffixes: SUFFIXES, tlds: [] };
  const word = String(seed || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\..*$/, '').replace(/[^a-z0-9]/g, '');
  const ind = String(industry || '').trim().slice(0, 80);
  if (!word || !env.ANTHROPIC_API_KEY) return fallback;
  const industryBlock = ind ? `

This company is in: "${ind}". Personalize for it:
- ADD up to 6 industry-relevant PREFIXES and up to 6 industry-relevant SUFFIXES that pair naturally with "${word}" (e.g. healthcare → health, care, med, rx, clinic, vital). Only ones that read as a credible startup domain (e.g. DartHealth, HealthDart).
- From this list of REAL niche TLDs, pick up to 6 that fit "${ind}": ${INDUSTRY_TLDS.join(', ')}. Return them (bare, no dot) in "tlds". Choose ONLY from that list.` : '';
  const system = `You pick which brand-domain PREFIXES and SUFFIXES read NATURALLY for one specific word, for a startup building its domain around "${word}"${ind ? ` (a ${ind} company)` : ''}.

Candidate prefixes: ${PREFIXES.join(', ')}
Candidate suffixes: ${SUFFIXES.join(', ')}

Keep ONLY the affixes that sound natural and credible for "${word}". Drop any that read awkwardly for this word — e.g. for "bathroom", "gobathroom"/"usebathroom" are bad; but for "swimming", "goswimming" is fine. Judge by how the COMBINED word sounds as a startup domain.
You MAY add up to 4 NEW word-appropriate prefixes/suffixes not in the lists if they genuinely fit this word (lowercase letters only). Never create a seam with a doubled letter.${industryBlock}
Return ONLY JSON: {"prefixes":[...],"suffixes":[...]${ind ? ',"tlds":[...]' : ''}} — subsets plus any additions. If almost none fit, return few. No prose, no code fences.`;
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });
    const model = env.ANTHROPIC_NAMING_MODEL || 'claude-haiku-4-5-20251001';
    const resp = await client.messages.create({
      model, max_tokens: 500, system,
      messages: [{ role: 'user', content: `Word: ${word}${ind ? `\nIndustry: ${ind}` : ''}` }],
    });
    recordModelUsage('anthropic', model, resp.usage);
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const parsed = extractJsonObject(text);
    if (!parsed) return fallback;
    const prefixes = clean(parsed.prefixes, 16);
    const suffixes = clean(parsed.suffixes, 20);
    const pool = new Set(INDUSTRY_TLDS);
    const tlds = ind ? clean(parsed.tlds, 8).filter((t) => pool.has(t)) : [];
    // Guard: if the model returned nothing usable, fall back so we never emit zero
    // candidates. A very short kept-set is fine (that's the point).
    if (!prefixes.length && !suffixes.length) return { ...fallback, tlds };
    return { prefixes, suffixes, tlds };
  } catch {
    return fallback;
  }
}

export default { pickAffixes };
