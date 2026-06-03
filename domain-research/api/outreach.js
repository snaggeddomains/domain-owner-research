import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { getRun } from '../lib/db/runs.js';
import { extractSignals } from '../lib/outreach/signals.js';
import { rankScenarios } from '../lib/outreach/classify.js';
import { generateOutreach, placeholderize, fillTemplate } from '../lib/outreach/generate.js';
import { SCENARIOS, SCENARIO_BY_ID } from '../lib/outreach/templates.js';
import { listTemplates, createTemplate } from '../lib/db/outreachTemplates.js';
import { withCategory } from '../lib/db/usage.js';

// Owner-outreach draft generator for a finished report.
//   POST { run_id, scenario_id? }            -> draft (auto-selected, or forced to
//                                                a template id / '__bespoke__')
//   POST { run_id, action:'save_template', title, subject, body } -> save a template
// The drafter ingests the full report context + the whole template catalog +
// an indicator-based ranking, then adapts a template, proposes a new one, or
// writes a fully bespoke email. It returns the chosen approach + the situation
// read + the personalization hooks so the UI can show its reasoning.
export const config = { maxDuration: 30 };

const BESPOKE = '__bespoke__';

function buildCatalog(custom, ranked) {
  const scoreOf = Object.fromEntries(ranked.map((r) => [r.id, r.score]));
  const builtins = SCENARIOS.map((s) => ({
    id: s.id,
    name: s.name,
    useWhen: s.bestFit,
    adjustment: s.adjustment,
    text: s.closest,
    builtin: true,
  })).sort((a, b) => (scoreOf[b.id] || 0) - (scoreOf[a.id] || 0));
  const customs = (custom || []).map((c) => ({
    id: c.id,
    name: c.name,
    useWhen: c.best_fit || null,
    adjustment: null,
    text: c.body,
    builtin: false,
  }));
  return [...builtins, ...customs];
}

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
    if (!title) { res.status(400).json({ error: 'Give the template a name' }); return; }
    if (!body.body || !String(body.body).trim()) { res.status(400).json({ error: 'Nothing to save' }); return; }
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
  const ranked = rankScenarios(signals);
  const catalog = buildCatalog(custom, ranked);

  // Resolve the user's forced selection (dropdown), if any.
  let forced = { mode: 'auto' };
  const sel = body.scenario_id;
  if (sel === BESPOKE) forced = { mode: 'bespoke' };
  else if (sel && catalog.some((c) => c.id === sel)) forced = { mode: 'template', templateId: sel };

  const scenarios = [
    { id: BESPOKE, name: '✨ Personalized (no template)' },
    ...SCENARIOS.map((s) => ({ id: s.id, name: s.name })),
    ...custom.map((c) => ({ id: c.id, name: c.name, custom: true })),
  ];

  // ── Skeleton mode: instant deterministic template-fill, NO LLM call. The UI
  // shows this immediately while the full LLM draft is sharpened in parallel.
  if (body.mode === 'skeleton') {
    let tpl = forced.mode === 'template' && forced.templateId ? catalog.find((c) => c.id === forced.templateId) : null;
    if (!tpl) {
      const topId = (ranked.find((r) => r.score > 0) || ranked[0] || {}).id;
      tpl = catalog.find((c) => c.id === topId) || catalog[0];
    }
    const skId = forced.mode === 'bespoke' ? BESPOKE : (tpl ? tpl.id : BESPOKE);
    const skReasons = (ranked.find((r) => r.id === (tpl && tpl.id)) || {}).reasons || [];
    res.status(200).json({
      domain: run.domain || '',
      scenario: { id: skId, name: forced.mode === 'bespoke' ? 'Personalized (no template)' : (tpl ? tpl.name : 'Template'), why: skReasons },
      approach: forced.mode === 'bespoke' ? 'bespoke' : 'template',
      situation: '',
      hooks: [],
      scenarios,
      subject: `${run.domain || ''} Domain Inquiry`,
      body: fillTemplate(tpl ? tpl.text : '', signals),
      fit: 'good',
      suggested_title: '',
      skeleton: true,
    });
    return;
  }

  const draft = await withCategory('outreach', () => generateOutreach({ signals, catalog, ranked, forced, env: process.env }));

  // The selected option for the dropdown: the chosen template id, or bespoke.
  const chosenId = draft.template_id || BESPOKE;
  const chosenName = draft.template_id ? (draft.template_name || (SCENARIO_BY_ID[draft.template_id]?.name) || 'Template') : 'Personalized (no template)';
  const rankReasons = (ranked.find((r) => r.id === draft.template_id) || {}).reasons || [];
  const why = draft.approach === 'template'
    ? (rankReasons.length ? rankReasons : ['Best-matching template'])
    : (draft.approach === 'new_template' ? ['No close template fit — drafted fresh; save it to reuse'] : ['No template fit — written bespoke for this report']);

  res.status(200).json({
    domain: run.domain || '',
    scenario: { id: chosenId, name: chosenName, why },
    approach: draft.approach,
    situation: draft.situation || '',
    hooks: draft.hooks || [],
    scenarios,
    subject: draft.subject,
    body: draft.body,
    fit: draft.fit || 'good',
    suggested_title: draft.suggested_title || '',
    fallback: Boolean(draft.fallback),
  });
}
