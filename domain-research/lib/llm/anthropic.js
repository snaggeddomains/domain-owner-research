import Anthropic from '@anthropic-ai/sdk';
import { runTool } from '../sources/index.js';
import { recordModelUsage } from '../db/usage.js';

// Anthropic (Claude) adapter: same shape as the OpenAI adapter.
// Uses the Messages API tool-use loop (tool_use / tool_result blocks),
// adaptive thinking, and prompt caching on the tools + system prefix.
// Map a raw API/SDK error to a clean, user-facing line for the known TRANSIENT
// failures (Anthropic overload / rate-limit / 5xx). Returns null for anything
// else so the caller falls back to the real message. Works on both a live SDK
// error (has .status) and an Inngest-serialized error (message string only).
export function friendlyApiError(err) {
  if (!err) return null;
  const status = err.status ?? err.statusCode;
  const type = err?.error?.error?.type || err?.error?.type;
  const msg = String((err && (err.message || err.name)) || err || '');
  if (status === 529 || type === 'overloaded_error' || /overloaded/i.test(msg)) {
    return "Claude's API was momentarily overloaded — a temporary hiccup on Anthropic's side, not a problem with the domain or your request. Please re-run the report in a moment.";
  }
  if (status === 429 || type === 'rate_limit_error' || /rate.?limit/i.test(msg)) {
    return "Claude's API rate limit was hit — wait a few seconds and re-run the report.";
  }
  if (typeof status === 'number' && status >= 500 && status < 600) {
    return `Claude's API had a temporary server error (${status}) — please re-run the report in a moment.`;
  }
  return null;
}

// Place a single rolling cache breakpoint on the LAST block of the LAST message,
// returning a shallow copy (the persistent `messages` array stays clean so we can
// re-mark a fresh tail each step). Anthropic caches the whole prefix up to that
// breakpoint and auto-reads the longest matching prefix on the next call — so as
// the conversation grows, each step only pays full input price for its newest
// turn and reads all prior turns from cache (~0.1× input). This is the big lever
// for a multi-step tool-use loop, where the re-sent tool-result history otherwise
// dominates uncached input. One breakpoint here + one on the system block = 2 of
// the 4 allowed. We never mark a thinking block (don't touch signed thinking).
function withConvCacheBreakpoint(messages) {
  if (!messages.length) return messages;
  const out = messages.slice();
  const last = out[out.length - 1];
  let content = last.content;
  if (typeof content === 'string') {
    content = [{ type: 'text', text: content, cache_control: { type: 'ephemeral' } }];
  } else if (Array.isArray(content) && content.length) {
    content = content.slice();
    const i = content.length - 1;
    if (content[i] && content[i].type === 'thinking') return messages; // leave signed thinking untouched
    content[i] = { ...content[i], cache_control: { type: 'ephemeral' } };
  } else {
    return messages;
  }
  out[out.length - 1] = { ...last, content };
  return out;
}

export async function runAgent({ system, history, userPrompt, toolSpecs, env, maxSteps, maxToolResultChars, seedTrace = [] }) {
  // maxRetries lets the SDK ride out short overloads/rate-limits within a single
  // attempt (exponential backoff that honors the Retry-After header) — so a
  // transient 529 recovers instead of failing the whole run.
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    maxRetries: Number(env.ANTHROPIC_MAX_RETRIES || 4),
  });
  const model = env.ANTHROPIC_MODEL || 'claude-opus-4-7';
  const effort = env.ANTHROPIC_EFFORT || 'high'; // low | medium | high | xhigh | max
  const thinking = env.ANTHROPIC_THINKING === 'disabled' ? { type: 'disabled' } : { type: 'adaptive' };
  const maxTokens = Number(env.ANTHROPIC_MAX_TOKENS || 16000);

  // Soft time budget. Each research step is a slow Opus call (high effort +
  // adaptive thinking, 60-120s each); enough of them overran the Vercel function
  // ceiling and the process was HARD-KILLED mid-call (FUNCTION_INVOCATION_TIMEOUT),
  // losing the whole report. Instead, keep researching for as long as the budget
  // allows, then stop starting new steps and force the final write-up from the
  // evidence already gathered — so a run is always thorough AND always returns a
  // report within its function budget. SOFT stops the loop; HARD caps the
  // finalize request itself so even that can't overrun. Defaults are tuned to the
  // 800s api/inngest.js maxDuration (leaving headroom for the deterministic seed
  // tools that run in the same invocation before runAgent); keep them in sync if
  // that ceiling changes. Tunable via env.
  const SOFT_MS = Number(env.AGENT_SOFT_DEADLINE_MS || 660000);
  const HARD_MS = Number(env.AGENT_HARD_DEADLINE_MS || 725000);
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;

  // Tools render before system. A cache_control breakpoint on the last system
  // block caches the whole tools + system prefix together, which is reused
  // across every step of the agent loop within a single research call.
  const tools = toolSpecs.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
  const systemBlocks = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];

  const messages = [...history, { role: 'user', content: userPrompt }];
  const trace = [...seedTrace];

  for (let step = 0; step < maxSteps; step++) {
    // Out of time to start another research round — break to the forced
    // finalize below rather than risk a hard kill mid-step.
    if (elapsed() > SOFT_MS) break;
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemBlocks,
      tools,
      thinking,
      output_config: { effort },
      // Cache the growing conversation prefix (in addition to the tools+system
      // prefix) so each step only pays full price for the newest turn.
      messages: withConvCacheBreakpoint(messages),
    });
    recordModelUsage('anthropic', model, response.usage); // best-effort cost log

    // Append the assistant's full content array verbatim — this preserves
    // thinking blocks and their signatures, which the API requires on the
    // next turn when interleaved thinking is active.
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason !== 'tool_use') {
      return { report: extractText(response.content), trace };
    }

    const toolUses = response.content.filter((b) => b.type === 'tool_use');
    const toolResults = await Promise.all(
      toolUses.map(async (block) => {
        const result = await runTool(block.name, block.input || {}, env);
        trace.push({
          tool: block.name,
          args: block.input,
          ok: result.ok,
          error: result.error || null,
          data: result.ok ? JSON.stringify(result.data).slice(0, 4000) : null,
        });
        const payload = result.ok ? result.data : { error: result.error };
        return {
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(payload).slice(0, maxToolResultChars),
          is_error: !result.ok,
        };
      }),
    );

    messages.push({ role: 'user', content: toolResults });
  }

  // Hit the step ceiling OR the soft deadline — force a final summary. No tools
  // and no thinking so the model writes the report straight from the evidence
  // gathered. A request timeout (remaining budget, no retries) guarantees this
  // can't itself overrun the function ceiling; if it does fail, salvage any text
  // already written so the run still saves a report instead of hard-failing.
  messages.push({ role: 'user', content: 'Stop researching and write your final report now from the evidence gathered.' });
  const finalizeTimeout = Math.min(120000, Math.max(20000, HARD_MS - elapsed()));
  try {
    const finalize = await client.messages.create(
      {
        model,
        max_tokens: maxTokens,
        system: systemBlocks,
        thinking: { type: 'disabled' },
        messages,
      },
      { timeout: finalizeTimeout, maxRetries: 0 },
    );
    recordModelUsage('anthropic', model, finalize.usage); // best-effort cost log
    const text = extractText(finalize.content);
    if (text) return { report: text, trace };
    return { report: salvageText(messages), trace };
  } catch (err) {
    console.error('[anthropic runAgent] finalize failed:', err && err.message);
    return { report: salvageText(messages), trace };
  }
}

function extractText(content) {
  return content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

// Last-resort report when the finalize call can't complete: stitch together the
// most recent assistant text the model did write during the loop. Better than
// throwing away a whole run's evidence on a timeout.
function salvageText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'assistant') continue;
    const text = Array.isArray(m.content) ? extractText(m.content) : (typeof m.content === 'string' ? m.content.trim() : '');
    if (text) return text;
  }
  return 'Research did not finish in time to compose a full report. The evidence gathered is in the trace below — re-run to complete it.';
}
