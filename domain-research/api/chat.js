import { isAuthed } from '../lib/auth.js';
import { getRun } from '../lib/db/runs.js';
import { appendChat, getChat } from '../lib/db/chat.js';
import { chatTurn } from '../lib/agent.js';

// Refine-chat for a research report: GET loads the transcript, POST runs one
// follow-up turn (with the full toolset) and persists both messages.
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.method === 'GET') {
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
  const reportMarkdown = (run.report && (run.report.markdown || '')) || '';

  try {
    const history = await getChat(runId);
    const result = await chatTurn({ domain, reportMarkdown, history, message, env: process.env });
    const reply = (result && result.report) || '(no response)';
    // Persist both messages (transcript = feedback/eval signal).
    await appendChat(runId, domain, 'user', message);
    await appendChat(runId, domain, 'assistant', reply);
    res.status(200).json({ reply });
  } catch (e) {
    res.status(502).json({ error: `Chat turn failed: ${String(e?.message || e).slice(0, 300)}` });
  }
}
