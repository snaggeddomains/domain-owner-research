import { getDb, isDbConfigured } from './supabase.js';

const T = 'domain_research_outreach_examples';

// Mined real outreach examples (Rob's actual first-touch emails) — a growing
// "voice toolkit" the drafter references alongside the built-in templates. All
// reads/writes are best-effort: if the table doesn't exist yet (migration not
// run) or the DB isn't configured, they no-op so core drafting still works.

export async function listExamples(limit = 400) {
  if (!isDbConfigured()) return [];
  try {
    const { data, error } = await getDb()
      .from(T)
      .select('id,domain,subject,body,situation,tags,source,sent_at,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function countExamples() {
  if (!isDbConfigured()) return 0;
  try {
    const { count, error } = await getDb().from(T).select('id', { count: 'exact', head: true });
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

// Upsert by ext_id (mailbox:threadId) so re-mining is idempotent. Best-effort;
// returns true on a successful write, false otherwise.
export async function upsertExample(row) {
  if (!isDbConfigured()) return false;
  const clean = {
    ext_id: row.ext_id ? String(row.ext_id).slice(0, 200) : null,
    domain: row.domain ? String(row.domain).toLowerCase().slice(0, 253) : null,
    subject: row.subject ? String(row.subject).slice(0, 300) : null,
    body: String(row.body || '').trim().slice(0, 6000),
    situation: row.situation ? String(row.situation).slice(0, 300) : null,
    tags: Array.isArray(row.tags) ? row.tags.map((t) => String(t).slice(0, 40)).slice(0, 20) : [],
    source: row.source || 'gmail',
    from_addr: row.from_addr ? String(row.from_addr).slice(0, 200) : null,
    sent_at: row.sent_at || null,
  };
  if (!clean.body || clean.body.length < 40) return false;
  try {
    const { error } = await getDb().from(T).upsert(clean, { onConflict: 'ext_id' });
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}
