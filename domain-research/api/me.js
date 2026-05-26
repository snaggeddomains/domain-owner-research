import { isAuthed, gateEnabled } from '../lib/auth.js';

export default function handler(req, res) {
  // Never cache auth status, or a stale pre-login {authed:false} can be replayed
  // after a successful login and keep the gate up.
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ authed: isAuthed(req), gateEnabled: gateEnabled() });
}
