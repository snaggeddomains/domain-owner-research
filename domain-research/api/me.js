import { currentUser, gateEnabled, ensureAdminSeed } from '../lib/auth.js';

export default async function handler(req, res) {
  // Never cache auth status, or a stale pre-login {authed:false} can be replayed
  // after a successful login and keep the gate up.
  res.setHeader('Cache-Control', 'no-store');
  // Seed the first admin from env vars if the users table is still empty.
  await ensureAdminSeed();
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
