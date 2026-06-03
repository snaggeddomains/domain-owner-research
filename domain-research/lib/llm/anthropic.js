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

  // Tools render before system. A cache_control breakpoint on the last system
  // block caches the whole tools + system prefix together, which is reused
  // across every step of the agent loop within a single research call.
  const tools = toolSpecs.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
  const systemBlocks = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];

  const messages = [...history, { role: 'user', content: userPrompt }];
  const trace = [...seedTrace];

  for (let step = 0; step < maxSteps; step++) {
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

  // Hit the step ceiling — force a final summary. No tools and no thinking so
  // the model has to write the report straight from the evidence gathered.
  messages.push({ role: 'user', content: 'Stop researching and write your final report now from the evidence gathered.' });
  const finalize = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemBlocks,
    thinking: { type: 'disabled' },
    messages,
  });
  recordModelUsage('anthropic', model, finalize.usage); // best-effort cost log
  return { report: extractText(finalize.content), trace };
}

function extractText(content) {
  return content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}
