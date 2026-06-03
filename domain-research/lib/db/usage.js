import { getDb, isDbConfigured } from './supabase.js';

// Per-call API-usage log that powers the snagged-admin "Reports → Cost" tab.
// One row per paid action, keyed by a free-form `meter` string (e.g.
// 'fullenrich.enrich', 'rocketreach.lookup', 'anthropic.<model>.input').
// `units` is in the meter's NATURAL BILLING UNIT so the admin can price it
// cleanly: 1 per lookup/enrichment/phone; LLM tokens are logged in MILLIONS of
// tokens (units = tokens / 1e6) so the rate is "$ per 1M tokens". The admin sets
// $/unit per meter in the Reports tab; cost = sum(units) × rate. Best-effort —
// cost logging must NEVER break a research request.
const T = 'domain_research_api_usage';

export async function recordUsage(meter, units, { run_id = null, meta = null } = {}) {
  try {
    if (!isDbConfigured() || !meter) return;
    const n = Number(units);
    if (!Number.isFinite(n) || n <= 0) return;
    await getDb().from(T).insert({ meter, units: n, run_id, meta });
  } catch {
    /* swallow — never let usage logging surface to the caller */
  }
}

// Record an LLM call's token usage. `usage` is the provider response.usage:
// Anthropic { input_tokens, output_tokens, cache_read_input_tokens,
// cache_creation_input_tokens }; OpenAI { prompt_tokens, completion_tokens }.
// Logged in 1M-token units under per-model meters so rates read as "$ / 1M".
export async function recordModelUsage(provider, model, usage, opts = {}) {
  if (!usage) return;
  const m = String(model || 'unknown');
  const M = 1_000_000;
  const input = usage.input_tokens ?? usage.prompt_tokens ?? 0;
  const output = usage.output_tokens ?? usage.completion_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  await Promise.all([
    recordUsage(`${provider}.${m}.input`, input / M, opts),
    recordUsage(`${provider}.${m}.output`, output / M, opts),
    recordUsage(`${provider}.${m}.cache_read`, cacheRead / M, opts),
    recordUsage(`${provider}.${m}.cache_write`, cacheWrite / M, opts),
  ]);
}
