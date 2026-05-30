import { findUserByEmail, countUsers } from '../lib/db/users.js';
import { verifyPassword, setAuthCookie, ensureAdminSeed } from '../lib/auth.js';
import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed — use POST' });
    return;
  }
  // Seed the first admin from env vars if the users table is still empty.
  await ensureAdminSeed();

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  // Trim the password so a stray paste-newline/space can't silently mismatch
  // the hash we stored from the (trimmed) env var on seed.
  const password = typeof body.password === 'string' ? body.password.trim() : '';
  if (!password) {
    res.status(400).json({ error: 'Password required' });
    return;
  }

  // Multi-user path: email + password against the users table.
  if (email) {
    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Incorrect email or password' });
      return;
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: 'Incorrect email or password' });
      return;
    }
    res.setHeader('Set-Cookie', setAuthCookie(user.id));
    res.status(200).json({ ok: true, user: publicUser(user) });
    return;
  }

  // Legacy single-password path: only valid while no users exist yet (or if
  // the migration hasn't been applied — countUsers throws, we treat it as 0).
  const usersExist = await countUsers().catch(() => 0);
  if (usersExist === 0 && process.env.APP_PASSWORD && password.trim() === process.env.APP_PASSWORD.trim()) {
    const legacy = crypto.createHash('sha256').update('dr:' + process.env.APP_PASSWORD.trim()).digest('hex');
    res.setHeader('Set-Cookie', `dr_auth=${legacy}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
    res.status(200).json({ ok: true, user: { email: 'legacy-admin', is_admin: true } });
    return;
  }

  res.status(401).json({ error: 'Incorrect email or password' });
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    is_admin: Boolean(u.is_admin),
    permissions: u.permissions || {},
    email_notify_on_done: Boolean(u.email_notify_on_done),
  };
}
