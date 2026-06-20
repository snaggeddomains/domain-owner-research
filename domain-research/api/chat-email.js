import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { getRun } from '../lib/db/runs.js';
import { searchEmailThreads, fetchEmailThread, emailIngestConfigured } from '../lib/email/threads.js';
import { listChatEmails, attachChatEmail, detachChatEmail } from '../lib/db/chatEmails.js';

// Attach email threads to a report's chat so the agent reads them as context
// (instead of the user pasting correspondence). Same gate as the chat itself.
//   GET ?run_id=&list=1          -> { threads:[attached] }
//   GET ?run_id=&suggest=1       -> { threads:[candidates for the run's domain] }
//   GET ?run_id=&q=<query>       -> { threads:[candidates for a manual search] }
//   POST { run_id, action:'attach', mailbox, thread_id, subject, snippet }
//   POST { run_id, action:'detach', id }
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await currentUser(req);
  if (user && !userCan(user, 'domain_owner')) {
    res.status(403).json({ error: "You don't have access to the Domain Owner module" });
    return;
  }
  if (!emailIngestConfigured()) {
    res.status(503).json({ error: 'Email ingest is not configured on the server.' });
    return;
  }

  if (req.method === 'GET') {
    const rid = String(req.query.run_id || '');
    if (!rid) { res.status(400).json({ error: 'Missing run_id' }); return; }
    try {
      if (req.query.list) { res.status(200).json({ threads: await listChatEmails(rid) }); return; }
      let query = String(req.query.q || '').trim();
      if (!query || req.query.suggest) {
        const run = await getRun(rid).catch(() => null);
        const domain = (run && run.domain) || '';
        query = query || domain;
      }
      if (!query) { res.status(200).json({ threads: [] }); return; }
      const attached = new Set((await listChatEmails(rid)).map((t) => t.thread_id));
      const threads = (await searchEmailThreads(query)).map((t) => ({ ...t, attached: attached.has(t.threadId) }));
      res.status(200).json({ threads });
    } catch (e) {
      res.status(502).json({ error: String((e && e.message) || e).slice(0, 300) });
    }
    return;
  }

  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const rid = String(body.run_id || '');
  if (!rid) { res.status(400).json({ error: 'Missing run_id' }); return; }
  const run = await getRun(rid).catch(() => null);
  if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
  const who = user && user.email && user.email !== 'legacy-admin' ? (user.name || user.email) : null;

  try {
    if (body.action === 'detach') {
      await detachChatEmail(rid, body.id);
      res.status(200).json({ ok: true, threads: await listChatEmails(rid) });
      return;
    }
    if (body.action === 'refresh') {
      // Re-pull every attached thread so new replies since it was attached get
      // ingested (upsert on run_id+thread_id replaces the stored body).
      const attached = await listChatEmails(rid);
      let updated = 0;
      for (const t of attached) {
        try {
          const thread = await fetchEmailThread(t.mailbox, t.thread_id);
          if (!thread) continue;
          await attachChatEmail({
            runId: rid, domain: run.domain || '', mailbox: t.mailbox, threadId: t.thread_id,
            subject: thread.subject || t.subject || '', snippet: t.snippet || '',
            body: thread.text || '', attachedBy: who,
          });
          updated += 1;
        } catch { /* skip a thread that failed to refetch */ }
      }
      res.status(200).json({ ok: true, updated, threads: await listChatEmails(rid) });
      return;
    }
    if (body.action === 'attach') {
      const mailbox = String(body.mailbox || '');
      const threadId = String(body.thread_id || '');
      if (!mailbox || !threadId) { res.status(400).json({ error: 'Provide mailbox and thread_id' }); return; }
      const thread = await fetchEmailThread(mailbox, threadId);
      if (!thread) { res.status(404).json({ error: 'Thread not found' }); return; }
      await attachChatEmail({
        runId: rid, domain: run.domain || '', mailbox, threadId,
        subject: body.subject || thread.subject || '', snippet: body.snippet || '',
        body: thread.text || '', attachedBy: who,
      });
      res.status(200).json({ ok: true, threads: await listChatEmails(rid) });
      return;
    }
    res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e).slice(0, 300) });
  }
}
