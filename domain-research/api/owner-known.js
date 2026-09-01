// Known-owner call-out for the Domain Owner report: "we've worked with this owner before."
// Gated by `domain_owner` (the report's own perm) so every report viewer sees it. Proxies to
// the admin Deals owner directory via lib/ownerKnown.js. Read-only, fail-open (→ owners:[]).
//
//   GET /api/owner-known?domain=<d>&name=<owner>&email=<owner-email>

import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { knownOwners } from '../lib/ownerKnown.js';
import { normalizeDomain } from '../lib/util.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed — use GET' }); return; }
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await currentUser(req);
  if (user && !userCan(user, 'domain_owner')) {
    res.status(403).json({ error: "You don't have access to the Domain Owner module." });
    return;
  }

  const domain = normalizeDomain((req.query.domain || '').toString());
  const name = (req.query.name || '').toString().trim().slice(0, 120);
  const email = (req.query.email || '').toString().trim().toLowerCase().slice(0, 160);
  if (!domain && !name && !email) { res.status(400).json({ error: 'Nothing to match on.' }); return; }

  let owners = [];
  try { owners = await knownOwners({ domain, name, email }); } catch { owners = []; }
  res.status(200).json({ ok: true, owners });
}
