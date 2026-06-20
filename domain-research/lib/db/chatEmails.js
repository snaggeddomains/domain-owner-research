// Email threads a user attached to a Domain Owner report's CHAT, so the agent has
// the correspondence as context instead of the user pasting it in. Keyed by RUN
// (the chat is per-run). Stores the fetched thread text; the chat turn injects it.
//
// One-time migration: the `domain_research_chat_emails` table in supabase/schema.sql
// (RLS auto-enabled by the trailing domain_research_% loop) on the research project.

import { getDb, isDbConfigured } from './supabase.js';

const TABLE = 'domain_research_chat_emails';
const MAX_BODY = 24000;

function missingTable(error) {
  return error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message || ''));
}

// Attached threads for a run (newest first). Best-effort: [] when DB/table absent.
export async function listChatEmails(runId) {
  if (!isDbConfigured() || !runId) return [];
  try {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('id,mailbox,thread_id,subject,snippet,attached_by,created_at')
      .eq('run_id', String(runId))
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

// The full thread bodies for a run, concatenated for the agent context.
export async function chatEmailContext(runId, cap = 40000) {
  if (!isDbConfigured() || !runId) return '';
  try {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('subject,body,created_at')
      .eq('run_id', String(runId))
      .order('created_at', { ascending: true });
    if (error || !data || !data.length) return '';
    let out = '';
    for (const r of data) {
      const block = `--- EMAIL THREAD: ${r.subject || '(no subject)'} ---\n${(r.body || '').trim()}\n`;
      if (out.length + block.length > cap) break;
      out += block + '\n';
    }
    return out.trim();
  } catch {
    return '';
  }
}

export async function isEmailAttached(runId, mailbox, threadId) {
  if (!isDbConfigured()) return false;
  try {
    const { data } = await getDb().from(TABLE).select('id')
      .eq('run_id', String(runId)).eq('mailbox', mailbox).eq('thread_id', threadId).maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

export async function attachChatEmail({ runId, domain, mailbox, threadId, subject, snippet, body, attachedBy }) {
  if (!isDbConfigured()) throw new Error('Email storage is not configured.');
  if (!runId || !mailbox || !threadId) throw new Error('run_id, mailbox and thread_id are required.');
  const row = {
    run_id: String(runId),
    domain: String(domain || '').toLowerCase() || null,
    mailbox, thread_id: threadId,
    subject: (subject || '').slice(0, 400),
    snippet: (snippet || '').slice(0, 600),
    body: String(body || '').slice(0, MAX_BODY),
    attached_by: attachedBy || null,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await getDb().from(TABLE).upsert(row, { onConflict: 'run_id,thread_id' }).select('id').maybeSingle();
  if (error) {
    if (missingTable(error)) {
      throw new Error("Email table isn't set up yet — run the domain_research_chat_emails migration on the research project, then NOTIFY pgrst, 'reload schema'.");
    }
    throw new Error(error.message);
  }
  return data;
}

export async function detachChatEmail(runId, id) {
  if (!isDbConfigured()) throw new Error('Email storage is not configured.');
  const { error } = await getDb().from(TABLE).delete().eq('run_id', String(runId)).eq('id', id);
  if (error && !missingTable(error)) throw new Error(error.message);
  return true;
}
