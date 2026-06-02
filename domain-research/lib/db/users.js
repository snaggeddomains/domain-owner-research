import { getDb } from './supabase.js';

const USERS = 'domain_research_users';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function countUsers() {
  const { count, error } = await getDb().from(USERS).select('id', { count: 'exact', head: true });
  if (error) throw new Error(`countUsers: ${error.message}`);
  return count || 0;
}

export async function getUser(id) {
  if (!id) return null;
  const { data, error } = await getDb().from(USERS).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getUser: ${error.message}`);
  return data || null;
}

export async function findUserByEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return null;
  const { data, error } = await getDb()
    .from(USERS)
    .select('*')
    .ilike('email', e)
    .maybeSingle();
  if (error) throw new Error(`findUserByEmail: ${error.message}`);
  return data || null;
}

export async function listUsers() {
  const { data, error } = await getDb()
    .from(USERS)
    .select('id,email,is_admin,permissions,email_notify_on_done,created_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`listUsers: ${error.message}`);
  return data || [];
}

export async function createUser({ email, password_hash, is_admin = false, permissions = null, email_notify_on_done = false }) {
  const row = {
    email: normalizeEmail(email),
    password_hash,
    is_admin: Boolean(is_admin),
    email_notify_on_done: Boolean(email_notify_on_done),
  };
  if (permissions && typeof permissions === 'object') row.permissions = permissions;
  const { data, error } = await getDb().from(USERS).insert(row).select('*').single();
  if (error) throw new Error(`createUser: ${error.message}`);
  return data;
}

export async function updateUser(id, patch) {
  if (!id) throw new Error('updateUser: missing id');
  const allowed = {};
  if (patch.email !== undefined) allowed.email = normalizeEmail(patch.email);
  if (patch.password_hash !== undefined) allowed.password_hash = patch.password_hash;
  if (patch.is_admin !== undefined) allowed.is_admin = Boolean(patch.is_admin);
  if (patch.permissions !== undefined) allowed.permissions = patch.permissions;
  if (patch.email_notify_on_done !== undefined) allowed.email_notify_on_done = Boolean(patch.email_notify_on_done);
  if (patch.notify_in_app !== undefined) allowed.notify_in_app = Boolean(patch.notify_in_app);
  // Self-serve profile name fields (trimmed; empty string clears to null).
  if (patch.first_name !== undefined) allowed.first_name = String(patch.first_name || '').trim() || null;
  if (patch.last_name !== undefined) allowed.last_name = String(patch.last_name || '').trim() || null;
  allowed.updated_at = new Date().toISOString();
  const { data, error } = await getDb().from(USERS).update(allowed).eq('id', id).select('*').single();
  if (error) throw new Error(`updateUser: ${error.message}`);
  return data;
}

export async function deleteUser(id) {
  const { error } = await getDb().from(USERS).delete().eq('id', id);
  if (error) throw new Error(`deleteUser: ${error.message}`);
}
