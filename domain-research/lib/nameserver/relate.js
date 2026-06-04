// Nameserver Search — relatedness intelligence.
//
// A nameserver pairing (especially a custom Cloudflare pair) groups domains by
// INFRASTRUCTURE, not by meaning — so a pairing can mix one owner's real
// portfolio with unrelated tenants. This pass asks the LLM to read the seed
// domain + its NS siblings and pick out the ones that are THEMATICALLY related
// (same brand family, topic, or naming pattern) and therefore likely the same
// owner — e.g. nationalvolleyballleague.com → volleyball*.com siblings.
//
// The output drives the next step: run FREE owner lookups (RDAP/WHOIS/DNS) only
// against the high-confidence related siblings to triangulate a shared owner,
// instead of burning effort on every tenant on the pair.
//
// Cheap by design — this is domain-name pattern matching, so it defaults to
// Haiku and caps the candidate list. Best-effort: any failure returns a
// heuristic fallback so the feature still works without the LLM.
import Anthropic from '@anthropic-ai/sdk';
import { recordModelUsage, withCategory } from '../db/usage.js';

const MAX_CANDIDATES = 200; // cap what we hand the model (token budget)

function sld(domain) {
  const s = String(domain || '').toLowerCase();
  const dot = s.indexOf('.');
  return dot > 0 ? s.slice(0, dot) : s;
}

// Heuristic fallback: token-overlap between the seed SLD and each sibling SLD.
// Crude, but gives a usable ranking when the LLM is unavailable.
function heuristicRelated(seed, siblings) {
  const seedTokens = new Set(sld(seed).match(/[a-z]+/g) || []);
  const scored = siblings.map((d) => {
    const toks = sld(d).match(/[a-z]+/g) || [];
    const hits = toks.filter((t) => t.length >= 3 && seedTokens.has(t));
    return { domain: d, relation: hits.length ? `shares "${hits.join(', ')}"` : 'same nameserver pairing', score: hits.length };
  });
  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => ({ domain: r.domain, confidence: r.score >= 2 ? 'medium' : 'low', relation: r.relation }));
}

function parseJsonLoose(text) {
  if (!text) return null;
  let s = String(text).replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const start = s.indexOf('{');
  if (start < 0) return null;
  s = s.slice(start);
  try { return JSON.parse(s); } catch { /* try to repair truncation */ }
  // The output was likely cut off mid-array (token cap). Keep everything up to
  // the last complete object and close the related[] array + wrapper object.
  const arr = s.indexOf('[');
  const lastObj = s.lastIndexOf('}');
  if (arr >= 0 && lastObj > arr) {
    try { return JSON.parse(s.slice(0, lastObj + 1) + ']}'); } catch { /* give up */ }
  }
  return null;
}

// Last-resort salvage: pull every {"domain","confidence","relation"} object out
// of the raw text by regex, even if the wrapper JSON is broken/truncated. The
// prompt fixes the key order, so this recovers the complete objects that arrived.
function salvageRelated(text) {
  if (!text) return [];
  const out = [];
  const re = /"domain"\s*:\s*"([^"]+)"\s*,\s*"confidence"\s*:\s*"([^"]*)"\s*,\s*"relation"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(text))) out.push({ domain: m[1], confidence: m[2], relation: m[3].replace(/\\"/g, '"') });
  return out;
}
function salvageSummary(text) {
  const m = String(text || '').match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return m ? m[1].replace(/\\"/g, '"').trim() : '';
}

// seedDomain + sibling domain strings → ranked related set with reasoning.
// Returns { related: [{domain, confidence: high|medium|low, relation}],
//           summary, model } — `related` is the triangulation shortlist.
export async function analyzeRelated(seedDomain, siblings, { env = process.env, context = null, pair = null } = {}) {
  const seed = String(seedDomain || '').toLowerCase();
  const candidates = [...new Set((siblings || []).map((s) => (typeof s === 'string' ? s : s && s.domain)).filter(Boolean))]
    .filter((d) => d !== seed)
    .slice(0, MAX_CANDIDATES);

  if (!candidates.length) return { related: [], summary: 'No sibling domains to analyze.', model: null };

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { related: heuristicRelated(seed, candidates), summary: 'Heuristic match (LLM unavailable).', model: null };
  }

  const model = env.NAMESERVER_RELATE_MODEL || env.ENRICHMENT_MODEL || 'claude-haiku-4-5-20251001';
  const accountUnique = pair && pair.accountUnique;
  const SYSTEM = `You analyze domains that share a nameserver pairing to decide which are LIKELY THE SAME OWNER as the seed domain.

NAMESERVER PAIRING TYPE: ${pair && pair.note ? pair.note : 'Unknown — treat co-location as weak evidence; judge by theme/identity.'}

${accountUnique
    ? 'Because this is an ACCOUNT-UNIQUE pair, START from the assumption that the siblings ARE the same owner. Your job is to LABEL the portfolio: group them by what they are (e.g. the owner\'s core brand, a product line, personal domains of the team, throwaway/test domains) and give a confidence that they belong to this owner. Only mark a sibling low/uncertain if it genuinely looks like it could be a different party.'
    : 'Because these nameservers may be shared by many owners, BE STRICT: only flag a sibling when there is a real semantic/brand/identity link to the seed (shared brand family, topic/industry, naming pattern, or an obvious variant). Mere co-location is not enough.'}

When OWNER CONTEXT is provided (from a research report on the seed), USE IT as the primary lens: judge a sibling by whether it fits this owner's identity, industry, people, or known associations — not just the seed's domain string. A sibling can be related through the owner's BACKGROUND even if it's off-theme from the seed's own name (e.g. a vacation-rental seed whose founders are blockchain builders makes crypto-explorer siblings a likely same-owner portfolio).

Output ONLY JSON:
{"summary":"one sentence on the owner/portfolio you infer","related":[{"domain":"x.com","confidence":"high|medium|low","relation":"why it ties to this owner (use the context/people/industry where relevant)"}]}
Order related most-confident first.${accountUnique ? ' Include the off-theme account siblings too, labeled for what they are.' : ' Omit domains with no real tie.'}`;

  const userPrompt = `SEED DOMAIN: ${seed}
${context && context.text ? `\nOWNER CONTEXT (from a research report on the seed):\n${context.text}\n` : ''}
SIBLING DOMAINS ON THE SAME NAMESERVER PAIRING:
${candidates.join('\n')}`;

  try {
    return await withCategory('nameserver', async () => {
      const client = new Anthropic({ apiKey });
      const resp = await client.messages.create({
        model,
        max_tokens: 8000,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userPrompt }],
      });
      recordModelUsage('anthropic', model, resp.usage);
      const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      const parsed = parseJsonLoose(text);
      // Prefer clean JSON; if that fails (truncation/odd wrapping), SALVAGE the
      // individual {domain,confidence,relation} objects straight from the text so
      // we still return real results instead of the dumb heuristic.
      let rawRelated = parsed && Array.isArray(parsed.related) ? parsed.related : salvageRelated(text);
      let summary = (parsed && parsed.summary) ? String(parsed.summary).trim() : salvageSummary(text);
      const known = new Set(candidates);
      const seen = new Set();
      const related = (rawRelated || [])
        .filter((r) => r && known.has(String(r.domain || '').toLowerCase()))
        .map((r) => ({
          domain: String(r.domain).toLowerCase(),
          confidence: ['high', 'medium', 'low'].includes(r.confidence) ? r.confidence : 'low',
          relation: String(r.relation || '').trim(),
        }))
        .filter((r) => (seen.has(r.domain) ? false : seen.add(r.domain)));
      if (!related.length) {
        return { related: heuristicRelated(seed, candidates), summary: summary || 'Heuristic match (model returned no usable results).', model };
      }
      return { related, summary, model };
    });
  } catch (e) {
    return { related: heuristicRelated(seed, candidates), summary: `Heuristic match (LLM error: ${e.message || e}).`, model };
  }
}
