// "Registered in N TLDs" — a free, DotDB-style demand signal. For a keyword/SLD we
// probe every IANA TLD (<sld>.<tld>) for nameservers; NS present = registered. One
// query per TLD, fanned across ~1,590 different registry authoritatives, so nothing
// is hammered. Cache-first by SLD (kind 'tc').
//
//   GET /api/tldcount?q=distribute[&refresh=1]  → { sld, count, extensions[], source }
//   GET /api/tldcount?list=1[&limit=10]         → recent lookups
//
// Gated by the `evaluate` module (SNAP Eval signal); admins auto-pass.

import { isAuthed, requireUser, userCan } from '../lib/auth.js';
import { withCategory } from '../lib/db/usage.js';
import { listToolLookups } from '../lib/db/tools.js';
import { countRegistrations, toSld } from '../lib/evaluate/tldcount.js';

export const config = { maxDuration: 60 };

const KIND = 'tc';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  // Standalone Research tool AND the SNAP Eval in-report signal both hit this —
  // allow either the base research module or the evaluate module (admins pass).
  const user = await requireUser(req, res);
  if (!user) return;
  if (!userCan(user, 'domain_owner') && !userCan(user, 'evaluate')) {
    res.status(403).json({ error: "You don't have access to this tool" });
    return;
  }

  // Recent lookups list.
  if (req.query.list) {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const lookups = await listToolLookups(KIND, limit);
    res.status(200).json({ lookups });
    return;
  }

  const sld = toSld(req.query.q || req.query.domain || req.query.sld);
  if (!sld) {
    res.status(400).json({ error: 'Provide ?q=<keyword-or-domain>' });
    return;
  }
  const refresh = req.query.refresh === '1' || req.query.refresh === 'true';

  try {
    const result = await withCategory('tldcount', () => countRegistrations(sld, { env: process.env, refresh }));
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
