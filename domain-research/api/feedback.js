import { isAuthed } from '../lib/auth.js';
import { normalizeDomain } from '../lib/util.js';
import { saveOwnerFeedback } from '../lib/db/knownowners.js';

// Capture a human correction on a report: was the owner right, and if not, who
// is it? Upserts the known-owners cache / eval set (one row per domain).
export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const domain = normalizeDomain(body.domain || '');
  if (!domain) {
    res.status(400).json({ error: 'Missing domain' });
    return;
  }
  const str = (v, n) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
  const id = await saveOwnerFeedback({
    domain,
    was_correct: typeof body.was_correct === 'boolean' ? body.was_correct : null,
    correct_owner: str(body.correct_owner, 300),
    owner_type: str(body.owner_type, 60),
    correct_contact: str(body.correct_contact, 500),
    notes: str(body.notes, 2000),
    run_id: str(body.run_id, 80),
  });
  res.status(200).json({ ok: true, id });
}
