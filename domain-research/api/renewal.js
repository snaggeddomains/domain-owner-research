// Renewal price — "if we acquired this name, what does it cost to RENEW each year?"
// Standard TLD renewal (Porkbun public pricing) + a registry-PREMIUM refinement for the
// specific name (Porkbun checkDomain). Not what the current owner pays — the cost for us.
//
//   GET /api/renewal?domain=turbo.app  → { domain, tld, currency, standard, premium, renewal, note }
//
// Gated by the `evaluate` module OR base `domain_owner` (SNAP Eval signal + standalone).

import { isAuthed, requireUser, userCan } from '../lib/auth.js';
import { withCategory } from '../lib/db/usage.js';
import { renewalPrice } from '../lib/evaluate/renewalprice.js';
import { cleanDomainInput } from '../lib/util.js';

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await requireUser(req, res);
  if (!user) return;
  if (!userCan(user, 'domain_owner') && !userCan(user, 'evaluate')) {
    res.status(403).json({ error: "You don't have access to this tool" });
    return;
  }

  const domain = cleanDomainInput(req.query.domain || req.query.q || '');
  if (!domain || !domain.includes('.')) { res.status(400).json({ error: 'Provide ?domain=<full domain>' }); return; }

  try {
    const result = await withCategory('renewal', () => renewalPrice(domain, process.env));
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
