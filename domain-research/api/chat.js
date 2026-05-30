import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { getRun } from '../lib/db/runs.js';
import { appendChat, getChat, getTurn } from '../lib/db/chat.js';
import { inngest, CHAT_REQUESTED } from '../lib/inngest/client.js';

// Refine-chat for a report. Turns run ASYNC via Inngest (they can fire several
// lookups and exceed the API function cap):
//   GET  ?run_id=        -> full transcript
//   GET  ?turn_id=       -> poll one turn { status, content }
//   POST { run_id, message } -> enqueue a turn, returns { turn_id } to poll
export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const _user = await currentUser(req);
  if (_user && !userCan(_user, 'domain_owner')) {
    res.status(403).json({ error: "You don't have access to the Domain Owner module" });
    return;
  }

  if (req.method === 'GET') {
    if (req.query.turn_id) {
      const t = await getTurn(req.query.turn_id);
      res.status(200).json({ status: (t && t.status) || 'pending', content: (t && t.content) || '' });
      return;
    }
    const runId = req.query.run_id;
    if (!runId) {
      res.status(400).json({ error: 'Missing run_id' });
      return;
    }
    res.status(200).json({ messages: await getChat(runId) });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const runId = String(body.run_id || '');
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4000) : '';
  if (!runId || !message) {
    res.status(400).json({ error: 'Provide run_id and message' });
    return;
  }

  const run = await getRun(runId).catch(() => null);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  const domain = run.domain || '';

  // Persist the user message + a pending assistant row, then enqueue the turn.
  await appendChat(runId, domain, 'user', message, 'done');
  const turnId = await appendChat(runId, domain, 'assistant', '', 'pending');
  if (!turnId) {
    res.status(500).json({ error: 'Chat storage not configured — run the domain_research_chat table SQL.' });
    return;
  }
  try {
    await inngest.send({ name: CHAT_REQUESTED, data: { turnId, runId } });
  } catch (e) {
    res.status(502).json({ error: `Could not enqueue the chat turn: ${String(e?.message || e).slice(0, 200)}` });
    return;
  }
  res.status(202).json({ turn_id: turnId });
}
