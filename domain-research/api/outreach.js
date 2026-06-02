import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { getRun } from '../lib/db/runs.js';
import { extractSignals } from '../lib/outreach/signals.js';
import { classifyScenario } from '../lib/outreach/classify.js';
import { generateOutreach } from '../lib/outreach/generate.js';
import { scenarioOptions, SCENARIO_BY_ID } from '../lib/outreach/templates.js';

// Owner-outreach draft generator for a finished report.
//   POST { run_id, scenario_id? } -> { scenario:{id,name,why[]}, scenarios[], subject, body }
// scenario_id overrides the auto-classified scenario (the UI dropdown). The
// draft itself is LLM-written, anchored on the matched template + report facts.
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const user = await currentUser(req);
  // Outreach rides on the Domain Owner module + its own optional permission.
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
  if (!run.report || !run.report.markdown) {
    res.status(409).json({ error: 'Report is not ready yet' });
    return;
  }

  const signals = extractSignals(run.report, run.domain || '');

  // Pick the scenario: explicit override (validated) or the classifier.
  let scenarioId;
  let why;
  const override = body.scenario_id && SCENARIO_BY_ID[body.scenario_id] ? body.scenario_id : null;
  if (override) {
    scenarioId = override;
    why = ['Manually selected'];
  } else {
    const classified = classifyScenario(signals);
    scenarioId = classified.id;
    why = classified.reasons;
  }

  const draft = await generateOutreach({ scenarioId, signals, env: process.env });

  res.status(200).json({
    domain: run.domain || '',
    scenario: { id: scenarioId, name: SCENARIO_BY_ID[scenarioId].name, why },
    scenarios: scenarioOptions(),
    subject: draft.subject,
    body: draft.body,
    fallback: Boolean(draft.fallback),
  });
}
