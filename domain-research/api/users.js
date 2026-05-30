import { requireAdmin, hashPassword } from '../lib/auth.js';
import { listUsers, createUser, updateUser, deleteUser, getUser, findUserByEmail } from '../lib/db/users.js';

// Admin-only user CRUD. One endpoint handles all four verbs:
//   GET                 → list users
//   POST    + body{...} → create user (email, password, is_admin?, permissions?, email_notify_on_done?)
//   PATCH   + body{id, ...patch}   → update user
//   DELETE  + body{id} OR ?id=...  → remove user
//
// The PATCH body may include a new `password` (plaintext) which is scrypt-hashed
// before saving. Empty / omitted password leaves the existing hash alone.
export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const method = req.method || 'GET';
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  try {
    if (method === 'GET') {
      const users = await listUsers();
      res.status(200).json({ users });
      return;
    }

    if (method === 'POST') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password.trim() : '';
      if (!email) { res.status(400).json({ error: 'Email is required' }); return; }
      if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }
      const dupe = await findUserByEmail(email);
      if (dupe) { res.status(409).json({ error: 'A user with that email already exists' }); return; }
      const user = await createUser({
        email,
        password_hash: await hashPassword(password),
        is_admin: Boolean(body.is_admin),
        permissions: sanitizePermissions(body.permissions),
        email_notify_on_done: Boolean(body.email_notify_on_done),
      });
      res.status(201).json({ user: stripHash(user) });
      return;
    }

    if (method === 'PATCH') {
      const id = body.id;
      if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
      const target = await getUser(id);
      if (!target) { res.status(404).json({ error: 'User not found' }); return; }
      const patch = {};
      if (typeof body.email === 'string') patch.email = body.email.trim().toLowerCase();
      if (typeof body.password === 'string' && body.password.trim().length > 0) {
        if (body.password.trim().length < 8) {
          res.status(400).json({ error: 'Password must be at least 8 characters' });
          return;
        }
        patch.password_hash = await hashPassword(body.password.trim());
      }
      if (body.is_admin !== undefined) {
        // Guard against an admin demoting themselves to a non-admin state when
        // they are the LAST admin in the system — that would lock everyone out
        // of the user-management view.
        if (target.id === admin.id && body.is_admin === false) {
          const users = await listUsers();
          const otherAdmins = users.filter((u) => u.is_admin && u.id !== admin.id).length;
          if (otherAdmins === 0) {
            res.status(400).json({ error: "You're the only admin — promote someone else first" });
            return;
          }
        }
        patch.is_admin = Boolean(body.is_admin);
      }
      if (body.permissions !== undefined) patch.permissions = sanitizePermissions(body.permissions);
      if (body.email_notify_on_done !== undefined) patch.email_notify_on_done = Boolean(body.email_notify_on_done);
      const user = await updateUser(id, patch);
      res.status(200).json({ user: stripHash(user) });
      return;
    }

    if (method === 'DELETE') {
      const id = body.id || req.query.id;
      if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
      if (id === admin.id) {
        res.status(400).json({ error: "You can't delete your own account" });
        return;
      }
      await deleteUser(id);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message || err) });
  }
}

// Whitelist only the keys we expect, coerced to booleans. Free-form jsonb but
// don't trust the client to set arbitrary fields.
function sanitizePermissions(p) {
  const known = ['domain_owner', 'trademark', 'appraisal', 'naming'];
  const out = {};
  if (p && typeof p === 'object') {
    for (const k of known) if (p[k] !== undefined) out[k] = Boolean(p[k]);
  }
  // Sensible default if the client sent nothing: full access for backwards
  // compatibility with how the admin seed user was created.
  if (Object.keys(out).length === 0) return { domain_owner: true, trademark: true, appraisal: true, naming: false };
  return out;
}

function stripHash(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}
