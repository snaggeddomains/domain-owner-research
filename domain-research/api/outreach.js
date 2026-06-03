import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { getRun } from '../lib/db/runs.js';
import { extractSignals } from '../lib/outreach/signals.js';
import { classifyScenario } from '../lib/outreach/classify.js';
import { generateOutreach, placeholderize } from '../lib/outreach/generate.js';
import { SCENARIO_BY_ID, builtinToTemplate, customToTemplate, scenarioOptions } from '../lib/outreach/templates.js';
import { listTemplates, createTemplate } from '../lib/db/outreachTemplates.js';

// Owner-outreach draft generator for a finished report.
//   POST { run_id, scenario_id? }            -> draft (auto-classified or overridden)
//   POST { run_id, action:'save_template', title, subject, body } -> save a custom template
// The draft is LLM-written, anchored on the matched template + report facts, and
// also reports a `fit` judgement + a `suggested_title` so the UI can offer "save
// this as a new template" when nothing fits well.
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const user = await currentUser(req);
  if (user && (!userCan(user, 'domain_owner') || !userCan(user, 'outreach'))) {
    res.status(403).json({ error: "You don't have access to the owner-outreach module" });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const runId = String(body.run_id || '');
  if (!runId) {
    res.status(400).json({ error: 'Missing run_id' });
    return;
  }
  const run = await getRun(runId).catch(() => null);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  const signals = extractSignals(run.report || {}, run.domain || '');

  // ── Save a custom template ────────────────────────────────────────────────
  if (body.action === 'save_template') {
    const title = String(body.title || '').trim();
    if (!title) {
      res.status(400).json({ error: 'Give the template a name' });
      return;
    }
    if (!body.body || !String(body.body).trim()) {
      res.status(400).json({ error: 'Nothing to save' });
      return;
    }
    // Generalize the concrete draft back into a reusable template.
    const tplBody = placeholderize(String(body.body), signals);
    const tplSubject = placeholderize(String(body.subject || '[DOMAIN] Domain Inquiry'), signals);
    try {
      const saved = await createTemplate({
        name: title,
        subject: tplSubject,
        body: tplBody,
        created_by: (user && user.id) || null,
        source_run_id: run.id,
      });
      res.status(200).json({ template: { id: saved.id, name: saved.name } });
    } catch (e) {
      res.status(500).json({ error: `Couldn't save template: ${String((e && e.message) || e)}` });
    }
    return;
  }

  // ── Draft ─────────────────────────────────────────────────────────────────
  if (!run.report || !run.report.markdown) {
    res.status(409).json({ error: 'Report is not ready yet' });
    return;
  }

  const custom = await listTemplates();
  const customById = Object.fromEntries(custom.map((c) => [c.id, c]));
  const scenarios = [...scenarioOptions(), ...custom.map((c) => ({ id: c.id, name: c.name, custom: true }))];

  // Resolve the selected template: explicit override (built-in or custom) or the
  // deterministic classifier's pick.
  let template;
  let scenarioId;
  let why;
  if (body.scenario_id && SCENARIO_BY_ID[body.scenario_id]) {
    scenarioId = body.scenario_id;
    template = builtinToTemplate(SCENARIO_BY_ID[scenarioId]);
    why = ['Manually selected'];
  } else if (body.scenario_id && customById[body.scenario_id]) {
    scenarioId = body.scenario_id;
    template = customToTemplate(customById[scenarioId]);
    why = ['Saved custom template'];
  } else {
    const classified = classifyScenario(signals);
    scenarioId = classified.id;
    template = builtinToTemplate(SCENARIO_BY_ID[scenarioId]);
    why = classified.reasons;
  }

  const draft = await generateOutreach({ template, signals, env: process.env });

  res.status(200).json({
    domain: run.domain || '',
    scenario: { id: scenarioId, name: template.name, why },
    scenarios,
    subject: draft.subject,
    body: draft.body,
    fit: draft.fit || 'good',
    suggested_title: draft.suggested_title || '',
    fallback: Boolean(draft.fallback),
  });
}
