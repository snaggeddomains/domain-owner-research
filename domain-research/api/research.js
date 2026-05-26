import { inngest, RUN_REQUESTED } from '../lib/inngest/client.js';
import { isValidDomain, normalizeDomain } from '../lib/util.js';
import { checkRateLimit, clientIp } from '../lib/ratelimit.js';
import { isAuthed } from '../lib/auth.js';
import { isDbConfigured } from '../lib/db/supabase.js';
import { createRun, getRun, failRun, setRunStatus, listRuns } from '../lib/db/runs.js';

export const config = { maxDuration: 60 };

function requiredKeyVar() {
  const provider = (process.env.LLM_PROVIDER || 'claude').toLowerCase();
  return provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
}

export default async function handler(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (!isDbConfigured()) {
    res.status(500).json({ error: 'Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' });
    return;
  }

  // ── List past runs (Projects view) ─────────────────────────────────────────
  if (req.method === 'GET' && req.query.list !== undefined) {
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : '';
    const runs = await listRuns({ q, limit: 50 });
    res.status(200).json({ runs });
    return;
  }

  // ── Poll a run ────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const id = req.query.id;
    if (!id) {
      res.status(400).json({ error: 'Missing run id' });
      return;
    }
    const run = await getRun(id);
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    res.status(200).json({
      id: run.id,
      domain: run.domain,
      status: run.status,
      stage: run.stage,
      report: run.report,
      error: run.error,
    });
    return;
  }

  // ── Enqueue a run ─────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const keyVar = requiredKeyVar();
  if (!process.env[keyVar]) {
    res.status(500).json({ error: `Server is missing ${keyVar} for the configured LLM_PROVIDER` });
    return;
  }

  const rl = await checkRateLimit(clientIp(req));
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    res.status(429).json({ error: `Rate limit exceeded — try again in ${rl.retryAfter}s.` });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  // ── Deepen an existing run (paid pass) ──────────────────────────────────────
  if (body.deepen) {
    const run = await getRun(body.id);
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    await setRunStatus(run.id, 'queued', 'queued');
    try {
      await inngest.send({
        name: RUN_REQUESTED,
        data: { runId: run.id, domain: run.domain, question: run.question || '', phase: 'deep' },
      });
    } catch (e) {
      await failRun(run.id, `Failed to enqueue deep pass: ${e?.message || e}`);
      res.status(502).json({ error: 'Could not enqueue the deep pass (check Inngest config).' });
      return;
    }
    res.status(202).json({ run_id: run.id, domain: run.domain, phase: 'deep' });
    return;
  }

  // ── New run (free pre-flight pass) ──────────────────────────────────────────
  const domain = normalizeDomain(body.domain);
  if (!isValidDomain(domain)) {
    res.status(400).json({ error: 'Please provide a valid domain, e.g. example.com' });
    return;
  }
  const question = typeof body.question === 'string' ? body.question.slice(0, 1000) : '';

  const runId = await createRun({ domain, question });
  try {
    await inngest.send({ name: RUN_REQUESTED, data: { runId, domain, question, phase: 'shallow' } });
  } catch (e) {
    await failRun(runId, `Failed to enqueue job: ${e?.message || e}`);
    res.status(502).json({ error: 'Could not enqueue the research job (check Inngest config).' });
    return;
  }

  res.status(202).json({ run_id: runId, domain });
}
