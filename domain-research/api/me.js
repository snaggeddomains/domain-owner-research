import { isAuthed, gateEnabled } from '../lib/auth.js';

export default function handler(req, res) {
  res.status(200).json({ authed: isAuthed(req), gateEnabled: gateEnabled() });
}
