// SNAP Research report API — the dictionary-walk candidate list (valuable one-word .coms whose
// owner has likely let them go). Gated by `snap_research` (admins auto-pass). GET → stats +
// candidate rows; POST {action:'dismiss'|'undismiss', domain}.

import { isAuthed, requireUser, userCan } from '../lib/auth.js';
import { snapCandidateList, snapStats, setSnapDismissed, snapResearchConfigured } from '../lib/db/snapResearch.js';

export const config = { maxDuration: 30 };

function canUse(user) {
  return userCan(user, 'snap_research') || userCan(user, 'admin');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await requireUser(req, res);
  if (!user) return;
  if (!canUse(user)) { res.status(403).json({ error: "You don't have access to this tool" }); return; }

  if (req.method === 'POST') {
    const b = req.body || {};
    const domain = String(b.domain || '').toLowerCase().trim();
    if (!domain || (b.action !== 'dismiss' && b.action !== 'undismiss')) {
      res.status(400).json({ error: 'action (dismiss|undismiss) + domain required' });
      return;
    }
    try { await setSnapDismissed(domain, b.action === 'dismiss'); res.status(200).json({ ok: true }); }
    catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
    return;
  }

  if (!snapResearchConfigured()) { res.status(200).json({ ok: true, configured: false, stats: null, rows: [] }); return; }

  const q = req.query || {};
  const all = q.all === '1';
  const includeDismissed = q.dismissed === '1';
  try {
    const [stats, rows] = await Promise.all([
      snapStats(),
      snapCandidateList({ limit: q.limit ? Number(q.limit) : 300, all, includeDismissed }),
    ]);
    res.status(200).json({ ok: true, configured: true, stats, rows });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
