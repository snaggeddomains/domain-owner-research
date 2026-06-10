import Anthropic from '@anthropic-ai/sdk';
import { runTool } from '../sources/index.js';
import { recordModelUsage } from '../db/usage.js';

// Anthropic (Claude) adapter: same shape as the OpenAI adapter.
// Uses the Messages API tool-use loop (tool_use / tool_result blocks),
// adaptive thinking, and prompt caching on the tools + system prefix.
export async function runAgent({ system, history, userPrompt, toolSpecs, env, maxSteps, maxToolResultChars, seedTrace = [] }) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.ANTHROPIC_MODEL || 'claude-opus-4-7';
  const effort = env.ANTHROPIC_EFFORT || 'high'; // low | medium | high | xhigh | max
  const thinking = env.ANTHROPIC_THINKING === 'disabled' ? { type: 'disabled' } : { type: 'adaptive' };
  const maxTokens = Number(env.ANTHROPIC_MAX_TOKENS || 16000);

  // Soft time budget. Each research step is a slow Opus call (high effort +
  // adaptive thinking, 60-120s each); MAX_STEPS of them routinely overran
  // Vercel's 300s function ceiling and the process was HARD-KILLED mid-call
  // (FUNCTION_INVOCATION_TIMEOUT), losing the whole report. Instead, stop
  // starting new research steps once we approach the budget and force the final
  // write-up from the evidence already gathered — so a run always returns a
  // report within its function budget. SOFT stops the loop; HARD caps the
  // finalize request itself so even that can't overrun. Tunable via env.
  // Defaults leave ~45s headroom under Vercel's 300s ceiling for the
  // deterministic seed tools that run in this same invocation BEFORE runAgent,
  // plus step/Inngest overhead.
  const SOFT_MS = Number(env.AGENT_SOFT_DEADLINE_MS || 190000);
  const HARD_MS = Number(env.AGENT_HARD_DEADLINE_MS || 255000);
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
      messages,
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
  // gathered. A request timeout (remaining budget) guarantees this can't itself
  // overrun the function ceiling; if it does fail, salvage any text already
  // written so the run still saves a report instead of hard-failing.
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
