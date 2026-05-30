import { currentUser, gateEnabled, ensureAdminSeed, clearAuthCookie } from '../lib/auth.js';
import { updateUser } from '../lib/db/users.js';

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

  // PATCH /api/me — the signed-in user updates their own preferences.
  // Today only email_notify_on_done is settable here; future self-serve
  // fields (display name, etc.) can land in the same body.
  if (req.method === 'PATCH') {
    const user = await currentUser(req);
    if (!user || !user.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const patch = {};
    if (body.email_notify_on_done !== undefined) patch.email_notify_on_done = Boolean(body.email_notify_on_done);
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'Nothing to update' });
      return;
    }
    const updated = await updateUser(user.id, patch);
    res.status(200).json({
      ok: true,
      user: {
        id: updated.id,
        email: updated.email,
        is_admin: Boolean(updated.is_admin),
        permissions: updated.permissions || {},
        email_notify_on_done: Boolean(updated.email_notify_on_done),
      },
    });
    return;
  }

  const user = await currentUser(req);
  const out = {
    authed: Boolean(user),
    gateEnabled: await gateEnabled(),
  };
  if (user) {
    out.user = {
      id: user.id,
      email: user.email,
      is_admin: Boolean(user.is_admin),
      permissions: user.permissions || {},
      email_notify_on_done: Boolean(user.email_notify_on_done),
    };
  }
  res.status(200).json(out);
}
