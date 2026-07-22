// Cron: continuously mine Rob's real first-touch outreach from the deal mailboxes
// into the referenceable examples toolkit, so the draft-outreach module keeps
// learning from what we actually send. Best-effort + idempotent (upsert by ext_id).
//
// Auth: Bearer CRON_SECRET (same as the other crons). Schedule in vercel.json.

import { mineOutreachExamples } from '../../lib/outreach/mine.js';
import { withCategory } from '../../lib/db/usage.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const max = Math.min(Number(req.query && req.query.max) || 40, 100);
    const result = await withCategory('outreach', () => mineOutreachExamples(process.env, { max }));
    res.status(200).json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
}
