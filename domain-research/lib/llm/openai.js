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

  for (let step = 0; step < maxSteps; step++) {
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

  // Hit the step ceiling — force a final summary from what we have.
  const finalize = await client.chat.completions.create({
    model,
    messages: [...messages, { role: 'user', content: 'Stop researching and write your final report now from the evidence gathered.' }],
    temperature: 0.2,
  });
  return { report: finalize.choices[0].message.content, trace };
}
