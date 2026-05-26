import { checkPassword, authCookie } from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed — use POST' });
    return;
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  if (!checkPassword(body.password)) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }
  res.setHeader('Set-Cookie', authCookie());
  res.status(200).json({ ok: true });
}
