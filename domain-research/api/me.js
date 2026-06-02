import { currentUser, gateEnabled, ensureAdminSeed, clearAuthCookie, hashPassword, verifyPassword } from '../lib/auth.js';
import { getUser, updateUser } from '../lib/db/users.js';

// Shared shape for the signed-in user across GET/PATCH responses.
function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name || null,
    last_name: u.last_name || null,
    is_admin: Boolean(u.is_admin),
    permissions: u.permissions || {},
    email_notify_on_done: Boolean(u.email_notify_on_done),
    created_at: u.created_at || null,
  };
}

export default async function handler(req, res) {
  // Never cache auth status, or a stale pre-login {authed:false} can be replayed
  // after a successful login and keep the gate up.
  res.setHeader('Cache-Control', 'no-store');
  // Seed the first admin from env vars if the users table is still empty.
  await ensureAdminSeed();

  // DELETE /api/me — sign out (clears the auth cookie). Lives here so logout
  // doesn't need its own serverless function under the Hobby plan's 12-fn cap.
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearAuthCookie());
    res.status(200).json({ ok: true });
    return;
  }

  // PATCH /api/me — the signed-in user updates their own profile/preferences:
  // email_notify_on_done, first_name/last_name, and a password change
  // (current_password + new_password).
  if (req.method === 'PATCH') {
    const user = await currentUser(req);
    if (!user || !user.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const patch = {};
    if (body.email_notify_on_done !== undefined) patch.email_notify_on_done = Boolean(body.email_notify_on_done);
    if (body.first_name !== undefined) patch.first_name = String(body.first_name || '').slice(0, 80);
    if (body.last_name !== undefined) patch.last_name = String(body.last_name || '').slice(0, 80);

    // Password change: verify the current password, then store a fresh hash.
    if (body.new_password !== undefined) {
      const next = String(body.new_password || '');
      if (next.length < 8) {
        res.status(400).json({ error: 'New password must be at least 8 characters.' });
        return;
      }
      const full = await getUser(user.id); // need the stored hash, not on currentUser()
      const ok = full && await verifyPassword(String(body.current_password || ''), full.password_hash);
      if (!ok) {
        res.status(400).json({ error: 'Current password is incorrect.' });
        return;
      }
      patch.password_hash = await hashPassword(next);
    }

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'Nothing to update' });
      return;
    }
    const updated = await updateUser(user.id, patch);
    res.status(200).json({ ok: true, user: publicUser(updated) });
    return;
  }

  const user = await currentUser(req);
  const out = {
    authed: Boolean(user),
    gateEnabled: await gateEnabled(),
  };
  if (user) out.user = publicUser(user);
  res.status(200).json(out);
}
