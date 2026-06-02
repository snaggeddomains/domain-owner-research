import { getDb, isDbConfigured } from './supabase.js';

const T = 'domain_research_naming_runs';

export async function saveNamingRun({ user_id, brief, filters, buyReady, stretch }) {
  if (!isDbConfigured()) return null;
  const row = {
    user_id: user_id || null,
    brief: String(brief || '').slice(0, 6000),
    filters: filters || null,
    buy_ready: Array.isArray(buyReady) ? buyReady : [],
    stretch: Array.isArray(stretch) ? stretch : [],
  };
  const { data, error } = await getDb().from(T).insert(row).select('id,created_at').single();
  if (error) throw new Error(`saveNamingRun: ${error.message}`);
  return data;
}

// q searches the brief text. user_id is optional — admins see all runs, every
// other user is scoped to their own (handled in the API layer).
export async function listNamingRuns({ user_id = null, q = '', limit = 100, starred_only = false } = {}) {
  const build = (cols, withStar) => {
    let query = getDb().from(T).select(cols).order('created_at', { ascending: false }).limit(limit);
    if (user_id) query = query.eq('user_id', user_id);
    if (q) query = query.ilike('brief', `%${String(q).replace(/[%_]/g, '')}%`);
    if (withStar && starred_only) query = query.eq('starred', true);
    return query;
  };
  // `title`/`starred` are newer columns; fall back if the migration isn't run yet.
  let { data, error } = await build('id,title,brief,filters,created_at,user_id,starred', true);
  if (error && /(title|starred)/i.test(error.message || '')) {
    ({ data, error } = await build('id,brief,filters,created_at,user_id', false));
  }
  if (error) throw new Error(`listNamingRuns: ${error.message}`);
  return data || [];
}

// Star/unstar a run (favorite).
export async function setNamingRunStar(id, starred) {
  const { data, error } = await getDb().from(T).update({ starred: !!starred }).eq('id', id).select('id,starred').single();
  if (error) throw new Error(`setNamingRunStar: ${error.message}`);
  return data;
}

// Set (or clear) a user-friendly project name on a run. Empty clears it (the UI
// then falls back to the brief snippet).
export async function renameNamingRun(id, title) {
  const t = String(title || '').replace(/\s+/g, ' ').trim().slice(0, 120) || null;
  const { data, error } = await getDb().from(T).update({ title: t }).eq('id', id).select('id,title').single();
  if (error) throw new Error(`renameNamingRun: ${error.message}`);
  return data;
}

export async function getNamingRun(id) {
  if (!id) return null;
  const { data, error } = await getDb().from(T).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getNamingRun: ${error.message}`);
  return data || null;
}
