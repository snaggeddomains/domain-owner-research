import { getDb } from './supabase.js';

const T = 'domain_research_naming_chat';

export async function listNamingChat(runId) {
  if (!runId) return [];
  const { data, error } = await getDb()
    .from(T)
    .select('id,role,content,refined_filters,result_snapshot,status,created_at')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`listNamingChat: ${error.message}`);
  return data || [];
}

export async function addNamingChatMessage({ run_id, role, content, refined_filters = null, result_snapshot = null, status = 'done' }) {
  if (!run_id || !role) throw new Error('addNamingChatMessage: run_id and role required');
  const row = {
    run_id,
    role,
    content: String(content || '').slice(0, 16000),
    refined_filters,
    result_snapshot,
    status,
  };
  const { data, error } = await getDb().from(T).insert(row).select('*').single();
  if (error) throw new Error(`addNamingChatMessage: ${error.message}`);
  return data;
}
