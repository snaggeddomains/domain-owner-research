// Internal, server-to-server: kick a FREE Domain Owner pre-flight report for a domain
// so a manually-created deal (or any admin surface) gets a report to auto-link. Deduped —
// if a queued/running/done run (or an errored run that still saved a pre-flight report)
// already exists for the domain, it's reused instead of spawning a duplicate. Mirrors the
// `prewarmDomainReport` the inquiry intake already does (api/lead-enrich.js).
//
//   POST { domain }   header x-internal-secret: RESEARCH_INTERNAL_SECRET
//   → { ok, runId, existed }
//
// Auth = the shared secret (machine-to-machine), NOT a user session — same pattern as the
// other internal endpoints (valuate, sales-comps, email-threads). It kicks the SHALLOW
// (free pre-flight) pass only — no paid credits are spent.

import { inngest, RUN_REQUESTED } from '../../lib/inngest/client.js';
import { listRuns, createRun } from '../../lib/db/runs.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.RESEARCH_INTERNAL_SECRET;
  if (!secret || req.headers['x-internal-secret'] !== secret) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  let domain = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    domain = String(body.domain || (req.query && req.query.domain) || '').trim().toLowerCase();
  } catch {
    res.status(400).json({ error: 'bad request' });
    return;
  }
  if (!domain || !domain.includes('.')) {
    res.status(400).json({ error: 'a valid domain is required' });
    return;
  }

  try {
    const runs = await listRuns({ q: domain, limit: 10, statuses: ['queued', 'running', 'done'], reportStatuses: ['error'] });
    const hit = runs.find((r) => String(r.domain).toLowerCase() === domain);
    if (hit) {
      res.status(200).json({ ok: true, runId: hit.id, existed: true });
      return;
    }
    const runId = await createRun({ domain });
    await inngest.send({ name: RUN_REQUESTED, data: { runId, domain, phase: 'shallow' } });
    res.status(200).json({ ok: true, runId, existed: false });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
