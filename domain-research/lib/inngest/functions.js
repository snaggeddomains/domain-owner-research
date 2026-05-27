import { inngest, RUN_REQUESTED, CHAT_REQUESTED } from './client.js';
import { research, chatTurn } from '../agent.js';
import { setRunStatus, saveRunReport, failRun, getRun } from '../db/runs.js';
import { getChat, updateTurn } from '../db/chat.js';

// Cost-gated pipeline. The default ('shallow') pass uses only FREE sources and
// still runs the LLM to write a narrative — but spends NO paid-API credits. A
// deliberate 'deep' pass (triggered by the user's "go deeper") opens the paid
// sources. Each step is durable; Inngest invokes /api/inngest per step, so the
// run survives well beyond a single function timeout.
export const runResearch = inngest.createFunction(
  { id: 'run-domain-research', retries: 1 },
  { event: RUN_REQUESTED },
  async ({ event, step }) => {
    const { runId, domain, question, phase = 'shallow' } = event.data;
    const deep = phase === 'deep';

    await step.run('mark-running', () => setRunStatus(runId, 'running', deep ? 'deepening' : 'gathering'));

    try {
      const result = await step.run('research', () =>
        research({ domain, question, env: process.env, tier: deep ? 'all' : 'free' }),
      );
      await step.run('save-report', () =>
        saveRunReport(runId, {
          format: 'markdown',
          markdown: result.report,
          trace: result.trace,
          toolsAvailable: result.toolsAvailable,
          categories: result.categories,
          phase,
        }),
      );
      return { runId, ok: true, phase };
    } catch (err) {
      const message = String(err?.message || err);
      await step.run('mark-error', () => failRun(runId, message));
      throw err; // let Inngest record the failure
    }
  },
);

// Refine-chat turn — async so it isn't bound by the 60s API function cap (a
// turn may run several lookups). The pending assistant row is filled in when done.
export const runChat = inngest.createFunction(
  { id: 'run-refine-chat', retries: 1 },
  { event: CHAT_REQUESTED },
  async ({ event, step }) => {
    const { turnId, runId } = event.data;
    try {
      const reply = await step.run('chat', async () => {
        const run = await getRun(runId);
        const domain = (run && run.domain) || '';
        const reportMarkdown = (run && run.report && run.report.markdown) || '';
        const rows = (await getChat(runId)).filter((m) => m.status !== 'pending');
        const message = rows.length ? rows[rows.length - 1].content : '';
        const history = rows.slice(0, -1);
        const result = await chatTurn({ domain, reportMarkdown, history, message, env: process.env });
        let text = String((result && result.report) || '').trim();
        if (!text) {
          // The model ended without a written answer — surface what it checked so
          // the turn is never a blank "(no response)".
          const tools = [...new Set((result.trace || []).map((t) => t.tool).filter(Boolean))].join(', ');
          text =
            `I ran the lookups${tools ? ` (${tools})` : ''} but couldn't compose a written answer that turn. ` +
            `Try a narrower, single-step ask — e.g. "run whois_lookup on horoscopes.com" or "whoxy_reverse the registrant email".`;
        }
        return text;
      });
      await step.run('save', () => updateTurn(turnId, reply, 'done'));
      return { turnId, ok: true };
    } catch (err) {
      await step.run('save-error', () => updateTurn(turnId, `⚠️ ${String(err?.message || err).slice(0, 300)}`, 'error'));
      throw err;
    }
  },
);

export const functions = [runResearch, runChat];
