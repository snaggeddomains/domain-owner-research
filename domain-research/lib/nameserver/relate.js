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
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// seedDomain + sibling domain strings → ranked related set with reasoning.
// Returns { related: [{domain, confidence: high|medium|low, relation}],
//           summary, model } — `related` is the triangulation shortlist.
export async function analyzeRelated(seedDomain, siblings, { env = process.env } = {}) {
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
  const SYSTEM = `You analyze domains that share a nameserver pairing to find which ones are LIKELY THE SAME OWNER.

A nameserver pairing groups domains by hosting infrastructure, not meaning — so the list mixes one owner's real portfolio with unrelated tenants on the same provider. Your job: identify the domains that are THEMATICALLY related to the seed domain (shared brand family, topic/industry, naming pattern, or obvious sibling like a ".net"/"get-"/"try-" variant), which strongly suggests common ownership.

Be strict: only flag a domain when there is a real semantic/brand link to the SEED, not merely "both are real words." Rank by how confident you are they share an owner.

Output ONLY JSON:
{"summary":"one sentence on the owner/theme you infer","related":[{"domain":"x.com","confidence":"high|medium|low","relation":"why it ties to the seed (brand/topic/pattern)"}]}
Order related most-confident first. Omit domains with no real tie.`;

  const userPrompt = `SEED DOMAIN: ${seed}

SIBLING DOMAINS ON THE SAME NAMESERVER PAIRING (pick the related ones):
${candidates.join('\n')}`;

  try {
    return await withCategory('nameserver', async () => {
      const client = new Anthropic({ apiKey });
      const resp = await client.messages.create({
        model,
        max_tokens: 1500,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userPrompt }],
      });
      recordModelUsage('anthropic', model, resp.usage);
      const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      const parsed = parseJsonLoose(text);
      if (!parsed || !Array.isArray(parsed.related)) {
        return { related: heuristicRelated(seed, candidates), summary: 'Heuristic match (model returned no JSON).', model };
      }
      const known = new Set(candidates);
      const related = parsed.related
        .filter((r) => r && known.has(String(r.domain || '').toLowerCase()))
        .map((r) => ({
          domain: String(r.domain).toLowerCase(),
          confidence: ['high', 'medium', 'low'].includes(r.confidence) ? r.confidence : 'low',
          relation: String(r.relation || '').trim(),
        }));
      return { related, summary: String(parsed.summary || '').trim(), model };
    });
  } catch (e) {
    return { related: heuristicRelated(seed, candidates), summary: `Heuristic match (LLM error: ${e.message || e}).`, model };
  }
}
