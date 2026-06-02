import { getDb } from './supabase.js';

// In-app notifications (the bell). One row per completed task for a user; the
// bell shows the unread count and a recent list that deep-links into the app.
// Table: domain_research_notifications (see supabase/schema.sql).
const T = 'domain_research_notifications';

export async function createNotification({ user_id, kind = 'report', title, body = null, link = null }) {
  if (!user_id || !title) return null;
  const { data, error } = await getDb()
    .from(T)
    .insert({ user_id, kind, title, body, link })
    .select('id')
    .single();
  if (error) throw new Error(`createNotification: ${error.message}`);
  return data;
}

export async function listNotifications(user_id, limit = 20) {
  const { data, error } = await getDb()
    .from(T)
    .select('id,kind,title,body,link,read_at,created_at')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listNotifications: ${error.message}`);
  return data || [];
}

export async function countUnread(user_id) {
  const { count, error } = await getDb()
    .from(T)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user_id)
    .is('read_at', null);
  if (error) throw new Error(`countUnread: ${error.message}`);
  return count || 0;
}

// Mark notifications read. ids = array → those rows; null/empty → all unread.
export async function markRead(user_id, ids = null) {
  let q = getDb()
    .from(T)
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user_id)
    .is('read_at', null);
  if (Array.isArray(ids) && ids.length) q = q.in('id', ids);
  const { error } = await q;
  if (error) throw new Error(`markRead: ${error.message}`);
}
