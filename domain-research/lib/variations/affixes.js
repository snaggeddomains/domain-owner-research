// Word-aware affix selection. A fixed prefix/suffix list applied blindly produces
// nonsense for many words — "goswimming" reads fine but "gobathroom" doesn't. One
// cheap Haiku call filters the candidate affixes down to the ones that sound
// natural for THIS specific word (and may add a few word-appropriate extras).
// Fail-open: no key / bad output → the full default lists.
import Anthropic from '@anthropic-ai/sdk';
import { PREFIXES, SUFFIXES, INDUSTRY_TLDS } from './enumerate.js';
import { extractJsonObject } from '../naming/brief.js';
import { recordModelUsage } from '../db/usage.js';
import { fetchText, extractClues } from '../util.js';

const clean = (arr, cap) => [...new Set((Array.isArray(arr) ? arr : [])
  .map((s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
  .filter((s) => s.length >= 1 && s.length <= 12))].slice(0, cap);

// Fetch a company's site and distill it to a short context string (title ·
// description · text excerpt) that tells the affix picker what the company does.
// Best-effort — https then http; failure → '' (no sharpening). Bounded to ~700 chars.
async function siteSummary(website) {
  let url = String(website || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const grab = async (u) => { try { const r = await fetchText(u, {}, 8000); return r && r.body ? r : null; } catch { return null; } };
  let r = await grab(url);
  if (!r || r.status >= 400) { const alt = await grab(url.replace(/^https:/, 'http:')); if (alt) r = alt; }
  if (!r || !r.body) return '';
  const c = extractClues(r.body);
  return [c.title, c.description, (c.text_excerpt || '').slice(0, 500)].filter(Boolean).join(' · ').replace(/\s+/g, ' ').slice(0, 700);
}

// Word-aware affix selection, optionally sharpened by the company's INDUSTRY and/or
// CURRENT WEBSITE. With either, the picker proposes context-relevant prefixes/
// suffixes (healthcare → health/care/med → DartHealth/HealthDart) and picks fitting
// REAL niche TLDs from INDUSTRY_TLDS (dart.health/.care). TLDs are validated against
// the pool (no hallucinated extensions). Returns { prefixes, suffixes, tlds };
// tlds is [] unless industry/website is given. Fail-open to the defaults.
export async function pickAffixes(seed, env = process.env, { industry = '', website = '' } = {}) {
  const fallback = { prefixes: PREFIXES, suffixes: SUFFIXES, tlds: [] };
  const word = String(seed || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\..*$/, '').replace(/[^a-z0-9]/g, '');
  const ind = String(industry || '').trim().slice(0, 80);
  if (!word || !env.ANTHROPIC_API_KEY) return fallback;
  const site = website ? await siteSummary(website) : '';
  const enrich = !!(ind || site);
  const ctx = [];
  if (ind) ctx.push(`This company is in the "${ind}" industry.`);
  if (site) ctx.push(`Its current website says: "${site}".`);
  const personalizeBlock = enrich ? `

PERSONALIZE using this context about the company:
${ctx.map((c) => `- ${c}`).join('\n')}
- Infer what the company actually does / its positioning + audience, then ADD up to 6 context-relevant PREFIXES and up to 6 context-relevant SUFFIXES that pair naturally with "${word}" (e.g. a healthcare co → health, care, med, clinic → DartHealth / HealthDart). Only ones that read as a credible startup domain.
- From this list of REAL niche TLDs, pick up to 6 that fit this company: ${INDUSTRY_TLDS.join(', ')}. Return them (bare, no dot) in "tlds". Choose ONLY from that list.` : '';
  const system = `You pick which brand-domain PREFIXES and SUFFIXES read NATURALLY for one specific word, for a startup building its domain around "${word}"${ind ? ` (a ${ind} company)` : ''}.

Candidate prefixes: ${PREFIXES.join(', ')}
Candidate suffixes: ${SUFFIXES.join(', ')}

Keep ONLY the affixes that sound natural and credible for "${word}". Drop any that read awkwardly for this word — e.g. for "bathroom", "gobathroom"/"usebathroom" are bad; but for "swimming", "goswimming" is fine. Judge by how the COMBINED word sounds as a startup domain.
You MAY add up to 4 NEW word-appropriate prefixes/suffixes not in the lists if they genuinely fit this word (lowercase letters only). Never create a seam with a doubled letter.${personalizeBlock}
Return ONLY JSON: {"prefixes":[...],"suffixes":[...]${enrich ? ',"tlds":[...]' : ''}} — subsets plus any additions. If almost none fit, return few. No prose, no code fences.`;
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });
    const model = env.ANTHROPIC_NAMING_MODEL || 'claude-haiku-4-5-20251001';
    const resp = await client.messages.create({
      model, max_tokens: 500, system,
      messages: [{ role: 'user', content: `Word: ${word}${ind ? `\nIndustry: ${ind}` : ''}${site ? '\n(website context provided above)' : ''}` }],
    });
    recordModelUsage('anthropic', model, resp.usage);
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const parsed = extractJsonObject(text);
    if (!parsed) return fallback;
    const prefixes = clean(parsed.prefixes, 16);
    const suffixes = clean(parsed.suffixes, 20);
    const pool = new Set(INDUSTRY_TLDS);
    const tlds = enrich ? clean(parsed.tlds, 8).filter((t) => pool.has(t)) : [];
    // Guard: if the model returned nothing usable, fall back so we never emit zero
    // candidates. A very short kept-set is fine (that's the point).
    if (!prefixes.length && !suffixes.length) return { ...fallback, tlds };
    return { prefixes, suffixes, tlds };
  } catch {
    return fallback;
  }
}

export default { pickAffixes };
