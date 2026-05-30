import { isAuthed, currentUser, requireAdmin } from '../lib/auth.js';
import { isDbConfigured } from '../lib/db/supabase.js';
import { createLesson, listLessons, updateLesson, deleteLesson } from '../lib/db/lessons.js';
import { distillLesson } from '../lib/llm/distill.js';
import { getRun } from '../lib/db/runs.js';
import { getChat } from '../lib/db/chat.js';

export const config = { maxDuration: 30 };

// Playbook-lessons endpoint. Action-multiplexed to stay under the function
// cap. Four flows:
//   POST { action: 'distill', run_id, message_id }
//     → Haiku-distill an assistant chat turn into a {title, body, tags}
//       DRAFT. Does not persist. Used by the in-chat "Save as lesson" modal.
//   POST { action: 'create', title, body, tags?, source_run_id?, source_chat_message_id? }
//     → Persist as status=pending (or status=approved if the caller is admin
//       AND explicitly passes status='approved'). Any signed-in user can
//       submit; admins curate.
//   GET ?status=pending|approved|all   → list (admin only)
//   PATCH { id, status?, title?, body?, tags?, notes? } → update (admin only)
//   DELETE ?id=...                     → remove (admin only)
export default async function handler(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (!isDbConfigured()) {
    res.status(500).json({ error: 'Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' });
    return;
  }
  try {
    return await route(req, res);
  } catch (e) {
    // Surface the underlying error to the admin UI rather than a bare 500.
    // Detect the common "table does not exist" case so the message points
    // at the fix (apply supabase/schema.sql) instead of being opaque.
    const msg = String((e && e.message) || e || 'unknown');
    if (/relation .*does not exist|playbook_lessons/i.test(msg)) {
      res.status(500).json({ error: `The playbook_lessons table doesn't exist on this Supabase yet — apply domain-research/supabase/schema.sql to create it. (${msg})` });
      return;
    }
    res.status(500).json({ error: msg });
  }
}

async function route(req, res) {
  const method = req.method;

  if (method === 'GET') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const lessons = await listLessons({ status });
    res.status(200).json({ lessons });
    return;
  }

  if (method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const action = String(body.action || 'create');
    if (action === 'distill') return handleDistill(req, res, body);
    if (action === 'create') return handleCreate(req, res, body);
    res.status(400).json({ error: `Unknown action: ${action}` });
    return;
  }

  if (method === 'PATCH') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (!body.id) { res.status(400).json({ error: 'id required' }); return; }
    const updated = await updateLesson(body.id, body);
    res.status(200).json({ lesson: updated });
    return;
  }

  if (method === 'DELETE') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = req.query.id || (req.body && req.body.id);
    if (!id) { res.status(400).json({ error: 'id required' }); return; }
    await deleteLesson(id);
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

async function handleDistill(req, res, body) {
  const runId = body.run_id;
  const messageId = body.message_id;
  if (!runId || !messageId) {
    res.status(400).json({ error: 'run_id and message_id are required' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY' });
    return;
  }
  const run = await getRun(runId);
  if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
  const messages = await getChat(runId);
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx < 0) { res.status(404).json({ error: 'Chat message not found' }); return; }
  const assistantMessage = messages[idx];
  if (assistantMessage.role !== 'assistant') {
    res.status(400).json({ error: 'Only assistant messages can be distilled' });
    return;
  }
  // Pair with the immediately-preceding user message so the distiller sees
  // the correction that triggered this response, not just the response.
  const userMessage = idx > 0 && messages[idx - 1].role === 'user' ? messages[idx - 1].content : '';
  const reportSnippet = (run.report && run.report.markdown) || '';
  try {
    const draft = await distillLesson({
      domain: run.domain,
      reportSnippet: reportSnippet.slice(0, 2000),
      userMessage,
      assistantMessage: assistantMessage.content,
      env: process.env,
    });
    res.status(200).json({ draft });
  } catch (e) {
    res.status(502).json({ error: `Distill failed: ${e.message || e}` });
  }
}

async function handleCreate(req, res, body) {
  const user = await currentUser(req);
  // Non-admin users can only create as 'pending' — they cannot self-approve.
  const status = user && user.is_admin && body.status === 'approved' ? 'approved' : 'pending';
  try {
    const lesson = await createLesson({
      title: body.title,
      body: body.body,
      tags: body.tags,
      source_run_id: body.source_run_id || null,
      source_chat_message_id: body.source_chat_message_id || null,
      created_by: user && user.id ? user.id : null,
      status,
    });
    res.status(201).json({ lesson });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
}
