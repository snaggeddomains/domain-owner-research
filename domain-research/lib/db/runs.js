import { getDb } from './supabase.js';

const RUNS = 'domain_research_runs';

export async function createRun({ domain, question, depth = 'standard', user_id = null }) {
  const row = { domain, question: question || null, depth, status: 'queued' };
  if (user_id) row.user_id = user_id;
  const { data, error } = await getDb().from(RUNS).insert(row).select('id').single();
  if (error) throw new Error(`createRun: ${error.message}`);
  return data.id;
}

export async function getRun(id) {
  const { data, error } = await getDb().from(RUNS).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getRun: ${error.message}`);
  return data || null;
}

// Lightweight list for the Projects view (no heavy report payload). Optional
// case-insensitive domain filter.
export async function listRuns({ q = '', limit = 100, statuses = null } = {}) {
  let query = getDb()
    .from(RUNS)
    .select('id,domain,status,stage,created_at,finished_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (statuses && statuses.length) query = query.in('status', statuses);
  if (q) query = query.ilike('domain', `%${q}%`);
  const { data, error } = await query;
  if (error) throw new Error(`listRuns: ${error.message}`);
  return data || [];
}

export async function setRunStatus(id, status, stage = null) {
  const patch = { status };
  if (stage !== null) patch.stage = stage;
  const { error } = await getDb().from(RUNS).update(patch).eq('id', id);
  if (error) throw new Error(`setRunStatus: ${error.message}`);
}

export async function saveRunReport(id, report) {
  const { error } = await getDb()
    .from(RUNS)
    .update({ status: 'done', stage: 'done', report, finished_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`saveRunReport: ${error.message}`);
}

// Patch ONLY the report jsonb (no status/finished_at change) — used to merge
// on-demand enrichments (e.g. a phone pulled later) into an already-done run.
export async function updateRunReport(id, report) {
  const { error } = await getDb().from(RUNS).update({ report }).eq('id', id);
  if (error) throw new Error(`updateRunReport: ${error.message}`);
}

export async function failRun(id, message) {
  const { error } = await getDb()
    .from(RUNS)
    .update({ status: 'error', error: String(message).slice(0, 2000), finished_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`failRun: ${error.message}`);
}
