import Anthropic from '@anthropic-ai/sdk';
import { recordModelUsage } from '../db/usage.js';
import { validateFilters } from './brief.js';
import { searchUniverse } from './query.js';

// Naming-run chat: the user already has a saved exercise (brief + parsed
// filters + result tables). They ask follow-ups in plain language. The agent
// returns either a conversational reply (no result change) OR a "refine"
// intent with updated filters, in which case we re-query name_universe with
// the merged filter set and return the new buy_ready/stretch.
//
// Single Haiku call. No tool loop — we keep the surface small for v1 so each
// turn stays sub-second and doesn't burn budget. Cross-module pivots
// ("research who owns medical.com") are a follow-up; the agent is told to
// say so plainly when asked something it can't do yet.
const SYSTEM = `You are a chat assistant helping refine a domain-naming exercise. The user has a saved run with:
- A free-form brief
- Parsed filters (TLDs, length range, num_words, dictionary_word_only, min/max price, min_quality_score, semantic_keywords)
- A current result set split into Buy-ready and Stretch

Your job: respond to the user's message with a SHORT conversational reply (1-3 sentences). When the user wants to REFINE the result set, also propose updated filters as a JSON patch. Output EXACTLY this JSON shape, nothing else:

{
  "reply": "1-3 sentence message to the user",
  "intent": "refine" | "explain" | "decline",
  "refined_filters": null | {
    "tlds": [".com"] | null,
    "sld_length_min": int | null,
    "sld_length_max": int | null,
    "num_words": 1 | 2 | null,
    "dictionary_word_only": true | false | null,
    "min_price": number | null,
    "max_price": number | null,
    "min_quality_score": number | null,
    "semantic_keywords": ["..."] | null,
    "exclude_domains": ["specific.com", "names.com"] | null,
    "exclude_inflected": true | false | null,
    "include_stretch": true | false | null
  }
}

Rules:
- "intent": use "refine" when the user wants to change the result set (raise/lower price, add/drop keywords, change length, drop specific domains, etc.). Use "explain" for questions about the current results, the filter logic, or how the universe works. Use "decline" when the user asks for something out of scope.
- "refined_filters" is a PARTIAL patch — include ONLY keys that should change. Omit unchanged fields (or set null). The server merges your patch onto the run's existing filters.
- semantic_keywords replace the previous list entirely when present (no merge). Lowercase, short, [a-z0-9] only.
- exclude_domains is ADDITIVE across turns — when the user names specific domains to drop (e.g. "drop requires.com and walked.com"), MERGE them with whatever exclude_domains were already in the current filters and return the full union. Each entry must be a full domain (sld + tld, e.g. "walked.com"), lowercase.
- exclude_inflected is a dictionary-backed boolean: when true, the server drops SLDs that an English-words table flags as inflected (plurals, past tense, -ing forms — e.g. walked, requires, running). Unknown / coined / technical words PASS THROUGH (saas, fintech, k8s). Set this when the user asks for "no plurals/past tense/inflected forms" or similar. Pair it with a clear reply about what it does and what it doesn't.
- Don't invent filter capabilities that don't exist. Specifically: there's NO source_tier filter (ranking already prefers tier-1 at equal quality); NO fuzzy semantic match beyond SLD substring; NO per-domain include list (you can only EXCLUDE specific domains). When the user asks for one of these, "decline" or "explain" — and suggest the workaround.
- Don't echo the full filter set in the reply — the UI shows it. Keep the reply about WHAT CHANGED and WHY.

Examples:
User: "drop the two-word names"
→ {"reply":"Filtered to 1-word names only.","intent":"refine","refined_filters":{"num_words":1}}

User: "drop requires.com and walked.com"
→ {"reply":"Excluded requires.com and walked.com from the results.","intent":"refine","refined_filters":{"exclude_domains":["requires.com","walked.com"]}}

User: "can we drop any plural or past tense names?"
→ {"reply":"Turned on the inflection filter — drops walked, requires, running, etc. by checking against a dictionary. Unknown/coined words like saas still pass through.","intent":"refine","refined_filters":{"exclude_inflected":true}}

User: "raise the cap to $200K and only show tier-1"
→ {"reply":"Raised max to $200K. Tier-1-only isn't a filter I have yet — the ranking already puts tier-1 first when quality ties.","intent":"refine","refined_filters":{"max_price":200000}}

User: "who owns medical.com?"
→ {"reply":"I can't pivot to Domain Owner research from this chat yet — open the Domain Owner module and search medical.com there.","intent":"decline","refined_filters":null}

User: "why is health.com not here?"
→ {"reply":"It's likely not in this universe (we pull from marketplace/managed inventory only — health.com is owner-held off-market), or it was filtered by your length/quality constraints.","intent":"explain","refined_filters":null}`;

export async function runNamingChatTurn({ run, history, message, env }) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  // maxRetries bumped so a transient 503/overloaded doesn't kill a refine turn.
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 5 });
  const model = env.ANTHROPIC_NAMING_CHAT_MODEL || env.ANTHROPIC_NAMING_MODEL || 'claude-haiku-4-5-20251001';

  const context = buildContext(run);
  const messages = [];
  // History as alternating user/assistant turns. Truncate long content so a
  // chatty thread doesn't blow the token budget.
  for (const m of history) {
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    messages.push({ role: m.role, content: String(m.content || '').slice(0, 2000) });
  }
  messages.push({ role: 'user', content: String(message || '').slice(0, 2000) });

  const response = await client.messages.create({
    model,
    max_tokens: 800,
    system: `${SYSTEM}\n\nContext for this naming run:\n${context}`,
    messages,
  });
  recordModelUsage('anthropic', model, response.usage);
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    // Fall back to treating the entire response as a plain reply.
    return { reply: text.slice(0, 1000) || '(no reply)', intent: 'explain', refined_filters: null, refined_results: null, merged_filters: null };
  }
  const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '(no reply)';
  const intent = ['refine', 'explain', 'decline'].includes(parsed.intent) ? parsed.intent : 'explain';

  let merged_filters = null;
  let refined_results = null;
  if (intent === 'refine' && parsed.refined_filters && typeof parsed.refined_filters === 'object') {
    merged_filters = mergeFilters(run.filters || {}, parsed.refined_filters);
    refined_results = await searchUniverse(merged_filters);
  }
  return { reply, intent, refined_filters: parsed.refined_filters || null, merged_filters, refined_results };
}

// Merge a partial patch onto the run's existing filters and re-run them
// through validateFilters so the same clamps that protect the search path
// also protect chat-driven refinements.
function mergeFilters(base, patch) {
  const merged = { ...(base || {}) };
  for (const k of Object.keys(patch)) {
    if (patch[k] === undefined || patch[k] === null) continue;
    merged[k] = patch[k];
  }
  return validateFilters(merged);
}

// Compact summary of the run's current state so the model can reason about
// it without us shipping the full 100-row result set every turn.
function buildContext(run) {
  const f = (run && run.filters) || {};
  const buy = Array.isArray(run.buyReady) ? run.buyReady : Array.isArray(run.buy_ready) ? run.buy_ready : [];
  const stretch = Array.isArray(run.stretch) ? run.stretch : [];
  const brief = String(run.brief || '').slice(0, 800);
  const topBuy = buy.slice(0, 8).map((r) => `${r.domain} ($${r.best_price ?? 'TBD'} · q${r.quality_score ?? '?'})`).join(', ') || '(none)';
  const topStretch = stretch.slice(0, 8).map((r) => `${r.domain} (q${r.quality_score ?? '?'})`).join(', ') || '(none)';
  return [
    `Brief: ${brief}`,
    `Filters: ${JSON.stringify(f)}`,
    `Buy-ready (${buy.length} total). Top: ${topBuy}`,
    `Stretch (${stretch.length} total). Top: ${topStretch}`,
  ].join('\n');
}
