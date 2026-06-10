import OpenAI from 'openai';
import { runTool } from '../sources/index.js';

// OpenAI adapter: drives the agent loop with chat-completions tool calling.
// Shared shape with the Anthropic adapter — see lib/agent.js for the selector.
export async function runAgent({ system, history, userPrompt, toolSpecs, env, maxSteps, maxToolResultChars, seedTrace = [] }) {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = env.OPENAI_MODEL || 'gpt-4o';

  const tools = toolSpecs.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  const messages = [
    { role: 'system', content: system },
    ...history,
    { role: 'user', content: userPrompt },
  ];

  const trace = [...seedTrace];

  // Soft time budget — stop starting new research steps before the function's
  // Vercel maxDuration so a heavy run forces its final write-up instead of being
  // hard-killed mid-step (see the Anthropic adapter for the full rationale).
  const SOFT_MS = Number(env.AGENT_SOFT_DEADLINE_MS || 190000);
  const HARD_MS = Number(env.AGENT_HARD_DEADLINE_MS || 255000);
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;

  for (let step = 0; step < maxSteps; step++) {
    if (elapsed() > SOFT_MS) break;
    const completion = await client.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.2,
    });

    const msg = completion.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { report: msg.content, trace };
    }

    const results = await Promise.all(
      msg.tool_calls.map(async (call) => {
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {
          /* leave args empty; tool will error cleanly */
        }
        const result = await runTool(call.function.name, args, env);
        trace.push({
          tool: call.function.name,
          args,
          ok: result.ok,
          error: result.error || null,
          data: result.ok ? JSON.stringify(result.data).slice(0, 4000) : null,
        });
        const payload = result.ok ? result.data : { error: result.error };
        return {
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(payload).slice(0, maxToolResultChars),
        };
      }),
    );

    messages.push(...results);
  }

  // Hit the step ceiling OR the soft deadline — force a final summary from what
  // we have. A request timeout caps the call to the remaining budget; on failure
  // salvage any answer the model already wrote so the run still saves a report.
  const finalizeTimeout = Math.min(120000, Math.max(20000, HARD_MS - elapsed()));
  try {
    const finalize = await client.chat.completions.create(
      {
        model,
        messages: [...messages, { role: 'user', content: 'Stop researching and write your final report now from the evidence gathered.' }],
        temperature: 0.2,
      },
      { timeout: finalizeTimeout, maxRetries: 0 },
    );
    const text = finalize.choices[0].message.content;
    if (text && text.trim()) return { report: text, trace };
    return { report: salvageText(messages), trace };
  } catch (err) {
    console.error('[openai runAgent] finalize failed:', err && err.message);
    return { report: salvageText(messages), trace };
  }
}

// Last-resort report when the finalize call can't complete: the most recent
// assistant text written during the loop.
function salvageText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'assistant' && typeof m.content === 'string' && m.content.trim()) return m.content.trim();
  }
  return 'Research did not finish in time to compose a full report. The evidence gathered is in the trace below — re-run to complete it.';
}
