import { clearAuthCookie } from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed — use POST' });
    return;
  }
  res.setHeader('Set-Cookie', clearAuthCookie());
  res.status(200).json({ ok: true });
}
