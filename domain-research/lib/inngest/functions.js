import { inngest, RUN_REQUESTED } from './client.js';
import { research } from '../agent.js';
import { setRunStatus, saveRunReport, failRun } from '../db/runs.js';

// Phase 1 pipeline: reuses the dual-provider agent (spine sources → report) and
// persists the result. Each step is durable; Inngest invokes the /api/inngest
// endpoint per step, so the run survives well beyond a single function timeout.
// (Phase 2 splits gathering into per-stage steps that fill the entity tables.)
export const runResearch = inngest.createFunction(
  { id: 'run-domain-research', retries: 1 },
  { event: RUN_REQUESTED },
  async ({ event, step }) => {
    const { runId, domain, question } = event.data;

    await step.run('mark-running', () => setRunStatus(runId, 'running', 'gathering'));

    try {
      const result = await step.run('research', () =>
        research({ domain, question, env: process.env }),
      );
      await step.run('save-report', () =>
        saveRunReport(runId, { format: 'markdown', markdown: result.report, trace: result.trace }),
      );
      return { runId, ok: true };
    } catch (err) {
      const message = String(err?.message || err);
      await step.run('mark-error', () => failRun(runId, message));
      throw err; // let Inngest record the failure
    }
  },
);

export const functions = [runResearch];
