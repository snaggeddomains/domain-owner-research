import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { isValidDomain, normalizeDomain } from '../lib/util.js';
import { addWatch, listWatches, stopWatch } from '../lib/db/beeper.js';
import { rdapStatus } from '../lib/beeper/rdap.js';

// Beeper — watch a domain's RDAP status and get alerted the moment it changes
// (especially the drop to available). Gated by the `beeper` module permission.
//   GET                       -> the caller's watches
//   POST { domain, note? }    -> start watching (seeds the current status)
//   POST { action:'stop', id }-> stop watching (delete the row)
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await currentUser(req);
  if (user && !userCan(user, 'beeper')) {
    res.status(403).json({ error: "You don't have access to the Beeper module — ask an admin to enable it." });
    return;
  }
  const userId = (user && user.id) || null;

  if (req.method === 'GET') {
    // Universal view — everyone with Beeper access sees the whole team watchlist
    // (each row carries `submitted_by` for the who-added-it chip).
    res.status(200).json({ watches: await listWatches() });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  if (body.action === 'stop') {
    if (!body.id) { res.status(400).json({ error: 'Missing id' }); return; }
    // Shared list → any Beeper user can stop any watch (not just their own).
    await stopWatch(body.id);
    res.status(200).json({ ok: true });
    return;
  }

  const domain = normalizeDomain(String(body.domain || ''));
  if (!domain || !isValidDomain(domain)) { res.status(400).json({ error: 'Provide a valid domain to watch.' }); return; }

  // Seed the baseline status so the very next cron tick can detect a CHANGE.
  const seed = await rdapStatus(domain).catch(() => null);
  const row = await addWatch({ domain, userId, note: body.note || null, seed });
  if (!row) { res.status(500).json({ error: 'Beeper storage not configured — run the beeper_watches table SQL.' }); return; }
  res.status(201).json({ ok: true, watch: row, status: seed });
}
