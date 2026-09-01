import Anthropic from '@anthropic-ai/sdk';
import { recordModelUsage } from '../db/usage.js';
import { extractJsonObject } from './brief.js';

// Off-brief cull — mirrors the manual "paste the CSV into an LLM and mark an X on
// anything wildly off-brief" step Rob used to do outside the tool. Given the brief
// and the candidate domains, one (batched) LLM call returns the domains that are
// CLEARLY off-scope for the brand the brief describes. Conservative by design: it
// only flags obvious misses, never a merely-weaker fit, so nothing good is culled.

const SYSTEM = `You are a domain-naming brief relevance judge for a professional naming agency.

You are given a NAMING BRIEF and a list of candidate domain names. Identify the names that are WILDLY OFF-BRIEF — clearly out of scope for the brand the brief describes: wrong industry/meaning, a jarring or irrelevant word, or an association no one reviewing this brief would ever shortlist.

RULES:
- Judge the SLD's MEANING and associations against the brief's theme, tone, and world — not its price, TLD, or length.
- Be CONSERVATIVE. Flag a name ONLY when it's OBVIOUSLY off-brief. A name that is merely a weaker, plainer, or more generic fit is NOT off-brief — keep it. When in doubt, KEEP it (do not flag).
- A name the brief explicitly lists/likes is NEVER off-brief.
- Use the domain string exactly as given.

Return ONLY valid JSON, no prose: {"off_brief": ["exact-domain", ...]} — the domains that are wildly off-brief. If none are, return {"off_brief": []}.`;

const BATCH = 300; // candidates per LLM call — bounds input+output size, run in parallel

export async function cullOffBrief(brief, domains, env = process.env) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  const list = [...new Set((domains || []).map((d) => String(d || '').trim().toLowerCase()).filter(Boolean))];
  if (!list.length) return [];
  const b = String(brief || '').trim();
  if (!b) throw new Error('A brief is required to judge off-brief names.');
  const model = env.NAMING_CULL_MODEL || env.ANTHROPIC_NAMING_MODEL || 'claude-haiku-4-5-20251001';
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });
  const valid = new Set(list);
  const chunks = [];
  for (let i = 0; i < list.length; i += BATCH) chunks.push(list.slice(i, i + BATCH));
  const off = new Set();
  await Promise.all(chunks.map(async (chunk) => {
    try {
      const resp = await client.messages.create({
        model,
        max_tokens: 4000,
        system: SYSTEM,
        messages: [{
          role: 'user',
          content: `BRIEF:\n${b.slice(0, 6000)}\n\nCANDIDATES (${chunk.length}):\n${chunk.join('\n')}\n\nReturn the JSON now.`,
        }],
      });
      recordModelUsage('anthropic', model, resp.usage);
      const text = resp.content.filter((x) => x.type === 'text').map((x) => x.text).join('\n');
      const parsed = extractJsonObject(text);
      const arr = parsed && Array.isArray(parsed.off_brief) ? parsed.off_brief : [];
      for (const d of arr) {
        const k = String(d || '').trim().toLowerCase();
        if (valid.has(k)) off.add(k); // only accept domains we actually sent
      }
    } catch { /* fail-open: a failed chunk simply flags nothing */ }
  }));
  return [...off];
}

export default { cullOffBrief };
