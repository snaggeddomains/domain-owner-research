import { verifyResetToken, hashPassword, setAuthCookie } from '../lib/auth.js';
import { getUser, updateUser } from '../lib/db/users.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed — use POST' });
    return;
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password.trim() : '';
  if (!token) { res.status(400).json({ error: 'Missing reset token' }); return; }
  if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }

  const parsed = verifyResetToken(token);
  if (!parsed) { res.status(401).json({ error: 'Reset link is invalid or expired — request a new one' }); return; }

  const user = await getUser(parsed.userId);
  if (!user) { res.status(401).json({ error: 'Reset link is invalid or expired — request a new one' }); return; }

  await updateUser(user.id, { password_hash: await hashPassword(password) });
  // Sign the user in immediately after a successful reset.
  res.setHeader('Set-Cookie', setAuthCookie(user.id));
  res.status(200).json({ ok: true, user: { id: user.id, email: user.email, is_admin: Boolean(user.is_admin) } });
}
