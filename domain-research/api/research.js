import { inngest, RUN_REQUESTED, RUN_CANCELLED } from '../lib/inngest/client.js';
import { isValidDomain, normalizeDomain } from '../lib/util.js';
import { checkRateLimit, clientIp } from '../lib/ratelimit.js';
import { isAuthed, currentUser, userCan, userCanReportPhase } from '../lib/auth.js';
import { isDbConfigured } from '../lib/db/supabase.js';
import { createRun, getRun, failRun, setRunStatus, listRuns, updateRunReport } from '../lib/db/runs.js';
import { runTool } from '../lib/sources/index.js';
import { withCategory } from '../lib/db/usage.js';

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

  // Module-permission gate (skipped for the legacy single-password cookie
  // session, where currentUser returns the synthetic admin pseudo-user).
  const _userForPerm = await currentUser(req);
  if (_userForPerm && !userCan(_userForPerm, 'domain_owner')) {
    res.status(403).json({ error: "You don't have access to the Domain Owner module" });
    return;
  }

  if (!isDbConfigured()) {
    res.status(500).json({ error: 'Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' });
    return;
  }

  // ── List past runs (Projects view) ─────────────────────────────────────────
  if (req.method === 'GET' && req.query.list !== undefined) {
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : '';
    // Show completed runs plus any actively-researching ones (skip transient
    // queued). Also surface errored runs that DID save a report — a deep pass
    // that timed out still leaves a usable free pre-flight report; without this
    // they'd vanish from Recent even though the report opens fine.
    const runs = await listRuns({ q, limit: 100, statuses: ['done', 'running'], reportStatuses: ['error'] });
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
      created_at: run.created_at,
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

  // ── Cancel an in-progress run (stop the spend) ──────────────────────────────
  // Marks the run cancelled and fires RUN_CANCELLED so Inngest stops the
  // pipeline at the next step boundary — no further (paid) steps run.
  if (body.cancel) {
    if (!body.id) {
      res.status(400).json({ error: 'Missing run id' });
      return;
    }
    const run = await getRun(body.id);
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    // Only terminal-ize a still-active run; leave done/error/cancelled as-is.
    if (run.status !== 'done' && run.status !== 'error' && run.status !== 'cancelled') {
      await setRunStatus(run.id, 'cancelled', 'cancelled');
    }
    try {
      await inngest.send({ name: RUN_CANCELLED, data: { runId: run.id } });
    } catch {
      /* best-effort — the status flip already stops the UI + blocks the save */
    }
    res.status(200).json({ ok: true, run_id: run.id, status: 'cancelled' });
    return;
  }

  // ── On-demand phone enhance (per-contact, paid) ─────────────────────────────
  // The report defaults to emails-only (FullEnrich phone is the expensive part).
  // This pulls a phone for ONE named person on explicit request and persists it
  // onto the run's report (report.enhancements) so it survives reloads without
  // re-spending. Gated like the deep pass since it spends premium credits.
  if (body.enhance_contact) {
    if (_userForPerm && !userCanReportPhase(_userForPerm, 'deep')) {
      res.status(403).json({ error: "You don't have access to premium enrichment — ask an admin to enable deep research." });
      return;
    }
    const run = await getRun(body.id);
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    const { name, linkedin_url, company } = body.enhance_contact || {};
    if (!name && !linkedin_url) {
      res.status(400).json({ error: 'Provide a contact name or linkedin_url to enhance.' });
      return;
    }
    const result = await withCategory('domain_owner', () => runTool('fullenrich_lookup', {
      name, linkedin_url, company, domain: run.domain, include_phone: true,
    }, process.env));
    const data = (result && result.data) || {};
    const phones = Array.isArray(data.phones) ? data.phones : [];
    const emails = Array.isArray(data.emails) ? data.emails : [];
    // Persist onto the report so a reload shows it without paying again.
    const report = (run.report && typeof run.report === 'object') ? run.report : {};
    const enhancements = Array.isArray(report.enhancements) ? report.enhancements : [];
    enhancements.push({ name: name || data.name || null, linkedin_url: linkedin_url || null, phones, emails, at: new Date().toISOString() });
    report.enhancements = enhancements;
    try { await updateRunReport(run.id, report); } catch { /* non-fatal: still return the result */ }
    res.status(result && result.ok ? 200 : 200).json({ ok: Boolean(result && result.ok), phones, emails, found: phones.length > 0 || emails.length > 0 });
    return;
  }

  // ── Regenerate report from refine-chat ─────────────────────────────────────
  // body.regenerate_from_chat = 'synth' (re-run critique with chat as
  // corrections, ~30-60s, no fresh tool calls) | 'deep' (re-run the full
  // gather + critique pipeline with chat seeded as context, ~3-5min). Either
  // mode requires the same permission as a fresh deep run, since the
  // synthesis still uses the SYSTEM_PROMPT + tools + LLM budget.
  if (body.regenerate_from_chat) {
    const mode = body.regenerate_from_chat === 'deep' ? 'deep' : 'synth';
    if (_userForPerm && !userCanReportPhase(_userForPerm, 'deep')) {
      res.status(403).json({ error: "You don't have access to regenerate reports — ask an admin to enable deep research." });
      return;
    }
    const run = await getRun(body.id);
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    if (!run.report || !run.report.markdown) {
      res.status(409).json({ error: 'No existing report to regenerate from yet — let the initial run finish first.' });
      return;
    }
    const phase = mode === 'deep' ? 'regenerate-deep' : 'regenerate-synth';
    await setRunStatus(run.id, 'queued', 'queued');
    try {
      await inngest.send({
        name: RUN_REQUESTED,
        data: { runId: run.id, domain: run.domain, question: run.question || '', phase },
      });
    } catch (e) {
      await failRun(run.id, `Failed to enqueue regeneration: ${e?.message || e}`);
      res.status(502).json({ error: 'Could not enqueue regeneration (check Inngest config).' });
      return;
    }
    res.status(202).json({ run_id: run.id, domain: run.domain, phase });
    return;
  }

  // ── Deepen an existing run (paid pass) ──────────────────────────────────────
  if (body.deepen) {
    if (_userForPerm && !userCanReportPhase(_userForPerm, 'deep')) {
      res.status(403).json({ error: "You don't have access to deep research reports — ask an admin to enable it." });
      return;
    }
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
  // Optional: skip the free pre-flight and go straight to the paid deep pass.
  const deep = body.deep === true || body.deep === 'true';
  const phase = deep ? 'deep' : 'shallow';
  // Phase-level permission: free vs deep can be independently granted by admin.
  if (_userForPerm && !userCanReportPhase(_userForPerm, phase)) {
    const label = phase === 'deep' ? 'deep research' : 'free';
    res.status(403).json({ error: `You don't have access to ${label} reports — ask an admin to enable it.` });
    return;
  }

  // Reuse the most recent completed run for this domain unless the user
  // explicitly forces a fresh research. Saves paid-API + LLM credits on what
  // is usually a re-search of a domain just looked at. The client surfaces a
  // "Researched X ago · Refresh" affordance to spend credits on demand.
  const force = body.force === true || body.force === 'true';
  if (!force) {
    const recents = await listRuns({ q: domain, limit: 10, statuses: ['done'], reportStatuses: ['error'] });
    const match = recents.find((r) => String(r.domain).toLowerCase() === domain.toLowerCase());
    if (match) {
      res.status(200).json({ run_id: match.id, domain, existing: true, created_at: match.created_at });
      return;
    }
  }

  const user = await currentUser(req);
  const runId = await createRun({ domain, question, user_id: user && user.id ? user.id : null });
  try {
    await inngest.send({ name: RUN_REQUESTED, data: { runId, domain, question, phase } });
  } catch (e) {
    await failRun(runId, `Failed to enqueue job: ${e?.message || e}`);
    res.status(502).json({ error: 'Could not enqueue the research job (check Inngest config).' });
    return;
  }

  res.status(202).json({ run_id: runId, domain, phase });
}
