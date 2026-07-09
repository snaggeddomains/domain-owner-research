import { getDb } from './supabase.js';

// Person deep-dive persistence. One "run" = one social-URL deep dive. The free
// dossier (identity + cross-platform presence + VIP + free professional context)
// lives in `result` jsonb; the PAID contact reveal lands in `contacts` jsonb
// (kept separate so we know whether a run has spent on contact lookup).
const RUNS = 'domain_research_person_runs';

export async function createPersonRun({ input_url, platform = null, subject_name = null, created_by = null }) {
  const row = { input_url, status: 'pending' };
  if (platform) row.platform = platform;
  if (subject_name) row.subject_name = subject_name;
  if (created_by) row.created_by = created_by;
  const { data, error } = await getDb().from(RUNS).insert(row).select('id').single();
  if (error) throw new Error(`createPersonRun: ${error.message}`);
  return data.id;
}

export async function getPersonRun(id) {
  const { data, error } = await getDb().from(RUNS).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getPersonRun: ${error.message}`);
  return data || null;
}

export async function listPersonRuns({ limit = 50, q = '' } = {}) {
  let query = getDb()
    .from(RUNS)
    .select('id,input_url,platform,subject_name,vip_band,status,revealed,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (q) query = query.or(`subject_name.ilike.%${q}%,input_url.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) throw new Error(`listPersonRuns: ${error.message}`);
  return data || [];
}

export async function setPersonRunStatus(id, status, patch = {}) {
  const update = { status, ...patch };
  if (update.error != null) update.error = String(update.error).slice(0, 2000);
  const { error } = await getDb().from(RUNS).update(update).eq('id', id);
  if (error) throw new Error(`setPersonRunStatus: ${error.message}`);
}

// Store the freshly-revealed paid contacts on the run.
export async function setPersonContacts(id, contacts) {
  const { error } = await getDb().from(RUNS).update({ contacts, revealed: true }).eq('id', id);
  if (error) throw new Error(`setPersonContacts: ${error.message}`);
}
