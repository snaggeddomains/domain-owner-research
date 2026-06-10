import { getDb, isDbConfigured } from './supabase.js';

// Per-report refine chat. Each turn (user + assistant) is a row tied to the run,
// so the transcript persists AND becomes feedback/eval signal (what a human had
// to correct, which follow-up lookup actually worked).
const TABLE = 'domain_research_chat';

const tableMissing = (e) =>
  /relation .* does not exist|does not exist|schema cache|PGRST205|42P01/i.test(String(e?.message || e?.code || e));

const missingCol = (e) => /author|could not find|column|PGRST204|42703|schema cache/i.test(String(e?.message || e?.code || e));

export async function appendChat(runId, domain, role, content, status = 'done', author = null) {
  if (!isDbConfigured() || !runId) return null;
  const base = { run_id: runId, domain: domain || null, role, content: String(content || '').slice(0, 12000), status };
  const row = author ? { ...base, author: String(author).slice(0, 120) } : base;
  const insert = async (r) => {
    const { data, error } = await getDb().from(TABLE).insert(r).select('id').single();
    if (error) throw error;
    return data?.id || null;
  };
  try {
    return await insert(row);
  } catch (e) {
    // The `author` column may not exist yet (pre-migration) — retry without it.
    if (author && missingCol(e)) {
      try { return await insert(base); } catch (e2) { if (!tableMissing(e2)) console.error('appendChat:', e2?.message || e2); return null; }
    }
    if (!tableMissing(e)) console.error('appendChat:', e?.message || e);
    return null;
  }
}

export async function getChat(runId, limit = 50) {
  if (!isDbConfigured() || !runId) return [];
  try {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('*') // '*' so the optional `author` column rides along when present
      .eq('run_id', runId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) {
    if (!tableMissing(e)) console.error('getChat:', e?.message || e);
    return [];
  }
}

export async function getTurn(turnId) {
  if (!isDbConfigured() || !turnId) return null;
  try {
    const { data, error } = await getDb().from(TABLE).select('id,role,content,status').eq('id', turnId).maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (e) {
    if (!tableMissing(e)) console.error('getTurn:', e?.message || e);
    return null;
  }
}

export async function updateTurn(turnId, content, status) {
  if (!isDbConfigured() || !turnId) return;
  try {
    const { error } = await getDb()
      .from(TABLE)
      .update({ content: String(content || '').slice(0, 12000), status })
      .eq('id', turnId);
    if (error) throw error;
  } catch (e) {
    if (!tableMissing(e)) console.error('updateTurn:', e?.message || e);
  }
}
