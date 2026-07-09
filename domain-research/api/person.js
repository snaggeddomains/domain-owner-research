// Person deep-dive API. Gated by the `research.person` permission.
//
//   POST {action:'create', url, name?}   → enqueue the FREE deep dive, returns {run_id}
//   POST {action:'reveal', run_id, phone?}→ PAID contact lookup (sync), returns {contacts}
//   GET  ?id=<runId>                      → {run}  (poll)
//   GET  ?list=1&q=                       → recent runs
//
// The free pass (identify + cross-platform VIP triangulation + LLM synthesis) runs
// async in the runPerson Inngest fn (past the 60s API cap), so create returns
// immediately and the UI polls. The paid contact reveal is bounded → runs inline.

import { isAuthed, requirePermission } from '../lib/auth.js';
import { isDbConfigured } from '../lib/db/supabase.js';
import { inngest, PERSON_REQUESTED } from '../lib/inngest/client.js';
import { createPersonRun, getPersonRun, listPersonRuns, setPersonContacts } from '../lib/db/person.js';
import { revealContacts, platformOf } from '../lib/person/orchestrate.js';
import { withCategory } from '../lib/db/usage.js';

export const config = { maxDuration: 60 };

function cleanUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try { const parsed = new URL(u); if (!/\./.test(parsed.host)) return null; return parsed.toString(); } catch { return null; }
}

async function handleGet(req, res) {
  if (req.query.list != null) {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const runs = await listPersonRuns({ q, limit });
    res.status(200).json({ runs });
    return;
  }
  const id = String(req.query.id || '').trim();
  if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
  const run = await getPersonRun(id);
  if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
  res.status(200).json({
    run: {
      id: run.id, input_url: run.input_url, platform: run.platform, subject_name: run.subject_name,
      status: run.status, stage: run.stage, error: run.error, vip_band: run.vip_band,
      result: run.result || null, contacts: run.contacts || null, revealed: !!run.revealed, created_at: run.created_at,
    },
  });
}

async function handleCreate(body, res, user) {
  const url = cleanUrl(body.url);
  if (!url) { res.status(400).json({ error: 'Provide a valid profile URL (LinkedIn, X/Twitter, Facebook, …).' }); return; }
  const platform = platformOf(url);
  const runId = await createPersonRun({
    input_url: url,
    platform: platform ? platform.key : 'other',
    subject_name: String(body.name || '').trim() || null,
    created_by: user?.id || null,
  });
  await inngest.send({ name: PERSON_REQUESTED, data: { runId } });
  res.status(202).json({ run_id: runId, input_url: url, platform: platform ? platform.key : 'other' });
}

// PAID — resolve emails/phones for an already-run person. Bounded → inline.
async function handleReveal(body, res) {
  const runId = String(body.run_id || '').trim();
  if (!runId) { res.status(400).json({ error: 'Missing run_id' }); return; }
  const run = await getPersonRun(runId);
  if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
  if (run.status !== 'done' || !run.result) { res.status(409).json({ error: 'Run is not finished yet.' }); return; }
  const subject = run.result.subject || {};
  const contacts = await withCategory('person', () => revealContacts({ subject, includePhone: !!body.phone, env: process.env }));
  await setPersonContacts(runId, contacts);
  res.status(200).json({ contacts });
}

export default async function handler(req, res) {
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (!isDbConfigured()) { res.status(500).json({ error: 'Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }); return; }
  const user = await requirePermission(req, res, 'research.person');
  if (!user) return;
  try {
    if (req.method === 'GET') return await handleGet(req, res);
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const action = String(body.action || 'create');
      if (action === 'create') return await handleCreate(body, res, user);
      if (action === 'reveal') return await handleReveal(body, res);
      res.status(400).json({ error: `Unknown action: ${action}` });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
