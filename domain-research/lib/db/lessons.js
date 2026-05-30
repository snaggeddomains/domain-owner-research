import { getDb, isDbConfigured } from './supabase.js';

const T = 'domain_research_playbook_lessons';

function normTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags
    .map((t) => String(t || '').toLowerCase().trim().replace(/[^a-z0-9_-]/g, ''))
    .filter((t) => t.length >= 2 && t.length <= 40))]
    .slice(0, 8);
}

function sanitize(input) {
  const out = {};
  if (typeof input.title === 'string') out.title = input.title.trim().slice(0, 200);
  if (typeof input.body === 'string') out.body = input.body.trim().slice(0, 4000);
  if (input.tags !== undefined) out.tags = normTags(input.tags);
  if (typeof input.notes === 'string') out.notes = input.notes.slice(0, 1000);
  if (input.source_run_id) out.source_run_id = input.source_run_id;
  if (input.source_chat_message_id) out.source_chat_message_id = input.source_chat_message_id;
  if (input.created_by) out.created_by = input.created_by;
  if (input.status && ['pending', 'approved', 'disabled'].includes(input.status)) out.status = input.status;
  return out;
}

export async function createLesson(input) {
  const payload = sanitize(input);
  if (!payload.title || !payload.body) throw new Error('createLesson: title and body are required');
  if (!payload.status) payload.status = 'pending';
  const { data, error } = await getDb().from(T).insert(payload).select('*').single();
  if (error) throw new Error(`createLesson: ${error.message}`);
  return data;
}

export async function listLessons({ status } = {}) {
  let q = getDb().from(T).select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(`listLessons: ${error.message}`);
  return data || [];
}

// Used by the agent on each run to prepend the approved lessons to its
// SYSTEM_PROMPT. v1 returns all approved lessons; tag-based scoping against
// pre-flight signals is a follow-up — the tags column is persisted and
// available for that pass.
export async function listApprovedLessons() {
  const { data, error } = await getDb()
    .from(T)
    .select('id,title,body,tags,applied_count')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listApprovedLessons: ${error.message}`);
  return data || [];
}

export async function updateLesson(id, patch) {
  if (!id) throw new Error('updateLesson: id required');
  const payload = sanitize(patch);
  payload.updated_at = new Date().toISOString();
  const { data, error } = await getDb().from(T).update(payload).eq('id', id).select('*').single();
  if (error) throw new Error(`updateLesson: ${error.message}`);
  return data;
}

export async function deleteLesson(id) {
  if (!id) throw new Error('deleteLesson: id required');
  const { error } = await getDb().from(T).delete().eq('id', id);
  if (error) throw new Error(`deleteLesson: ${error.message}`);
}

// Build the SYSTEM_PROMPT addendum for a research/chat run. Returns the
// formatted text and the ids of lessons it included (so the caller can bump
// applied_count after a successful save). Bounded by a character budget so
// the prompt stays a sane size as the lesson set grows. Silently returns
// empty when the DB isn't configured or the table doesn't exist yet — the
// agent must still run on a fresh deploy with no lessons table.
const LESSONS_ADDENDUM_BUDGET = 4000;
export async function loadLessonsAddendum() {
  try {
    if (!isDbConfigured()) return { addendum: '', ids: [] };
    const lessons = await listApprovedLessons();
    if (!lessons.length) return { addendum: '', ids: [] };
    const used = [];
    const parts = [];
    let remaining = LESSONS_ADDENDUM_BUDGET;
    for (const l of lessons) {
      const line = `- ${l.body}`;
      if (line.length + 1 > remaining) break;
      parts.push(line);
      used.push(l.id);
      remaining -= line.length + 1;
    }
    if (!parts.length) return { addendum: '', ids: [] };
    const addendum =
      `\n\nADDITIONAL PLAYBOOK LESSONS (admin-curated from prior chat refinements — treat as if they were in the main rules above):\n` +
      parts.join('\n');
    return { addendum, ids: used };
  } catch {
    return { addendum: '', ids: [] };
  }
}

// Best-effort applied-counter bump — fire-and-forget after a successful run.
// Failure here must never break the run, hence no throw.
export async function bumpAppliedCounts(ids) {
  if (!Array.isArray(ids) || !ids.length) return;
  try {
    const db = getDb();
    // No atomic increment via the JS client; read-then-write is fine for a
    // visibility counter that doesn't need strict accuracy.
    const { data } = await db.from(T).select('id,applied_count').in('id', ids);
    if (!data) return;
    await Promise.all(data.map((r) => db.from(T).update({ applied_count: (r.applied_count || 0) + 1 }).eq('id', r.id)));
  } catch {
    /* swallow — counter drift is acceptable */
  }
}
