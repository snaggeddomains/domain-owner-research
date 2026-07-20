import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { isValidDomain, normalizeDomain } from '../lib/util.js';
import { addWatch, listWatches, stopWatch } from '../lib/db/beeper.js';
import { rdapStatus } from '../lib/beeper/rdap.js';
import { attemptRegister } from '../lib/beeper/register.js';

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

  // Validate the Dynadot auto-register signing against Dynadot's SANDBOX (no real money).
  // Registers a throwaway test name — we only care that it gets PAST the X-Signature/auth
  // check: an auth/signature error = signing broken; success OR a domain-level reply
  // (not-available / insufficient-funds) = signing WORKS → the production buy will fire.
  if (body.action === 'test_register') {
    const testDomain = 'snagged-dropcampaign-test.com';
    const r = await attemptRegister(testDomain, process.env, { provider: 'dynadot', sandbox: true });
    const blob = `${r.code || ''} ${r.detail || ''} ${r.reason || ''}`.toLowerCase();
    const authBroken = /signature|unauthor|forbidden|401|403|invalid.*(key|token|sign)|no_key|missing/.test(blob);
    res.status(200).json({
      ok: true,
      signing_ok: !r.reason && !authBroken, // got past auth/signature
      registered: Boolean(r.ok),
      result: r,
      note: r.reason === 'no_key'
        ? 'Set DYNADOT_SANDBOX_KEY + DYNADOT_SANDBOX_SECRET in the research project, then redeploy.'
        : authBroken ? 'Auth/signature was REJECTED — the signing scheme needs a fix.'
        : 'Signing accepted ✓ — the production auto-register path is proven.',
    });
    return;
  }

  const domain = normalizeDomain(String(body.domain || ''));
  if (!domain || !isValidDomain(domain)) { res.status(400).json({ error: 'Provide a valid domain to watch.' }); return; }

  // Seed the baseline status so the very next cron tick can detect a CHANGE.
  const seed = await rdapStatus(domain).catch(() => null);
  const row = await addWatch({ domain, userId, note: body.note || null, seed, dropCampaign: Boolean(body.drop_campaign), autoRegister: Boolean(body.auto_register) });
  if (!row) { res.status(500).json({ error: 'Beeper storage not configured — run the beeper_watches table SQL.' }); return; }
  res.status(201).json({ ok: true, watch: row, status: seed });
}
