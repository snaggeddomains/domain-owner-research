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
export async function listNamingRuns({ user_id = null, q = '', limit = 100 } = {}) {
  let query = getDb()
    .from(T)
    .select('id,brief,filters,created_at,user_id')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (user_id) query = query.eq('user_id', user_id);
  if (q) query = query.ilike('brief', `%${String(q).replace(/[%_]/g, '')}%`);
  const { data, error } = await query;
  if (error) throw new Error(`listNamingRuns: ${error.message}`);
  return data || [];
}

export async function getNamingRun(id) {
  if (!id) return null;
  const { data, error } = await getDb().from(T).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getNamingRun: ${error.message}`);
  return data || null;
}
