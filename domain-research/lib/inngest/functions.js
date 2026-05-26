import { inngest, RUN_REQUESTED } from './client.js';
import { research } from '../agent.js';
import { setRunStatus, saveRunReport, failRun } from '../db/runs.js';

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

export const functions = [runResearch];
