import { getDb, isDbConfigured } from './supabase.js';

const T = 'domain_research_outreach_templates';

// Saved custom outreach templates (user-created scenarios beyond the built-in
// 7). List is best-effort: if the table doesn't exist yet (migration not run) or
// the DB isn't configured, return [] so the core drafting still works.
export async function listTemplates() {
  if (!isDbConfigured()) return [];
  try {
    const { data, error } = await getDb()
      .from(T)
      .select('id,name,subject,body,best_fit')
      .order('created_at', { ascending: true });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function createTemplate({ name, subject, body, best_fit = null, created_by = null, source_run_id = null }) {
  const row = {
    name: String(name || '').trim().slice(0, 120),
    subject: String(subject || '[DOMAIN] Domain Inquiry').trim().slice(0, 200),
    body: String(body || '').trim().slice(0, 8000),
    best_fit: best_fit ? String(best_fit).slice(0, 500) : null,
  };
  if (created_by) row.created_by = created_by;
  if (source_run_id) row.source_run_id = source_run_id;
  const { data, error } = await getDb().from(T).insert(row).select('id,name,subject,body,best_fit').single();
  if (error) throw new Error(`createTemplate: ${error.message}`);
  return data;
}
