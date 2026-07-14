import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { whoisLookup } from '../lib/whois/lookup.js';

// Whois — a basic, free domain lookup (RDAP + legacy WHOIS merged). Returns
// registrar, registration/expiry/updated dates, status codes, nameservers,
// DNSSEC and (when public) the registrant contact. Gated by the `whois` module
// permission.  GET ?domain=example.com
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await currentUser(req);
  // Allow the standalone Whois tool (`whois`) OR anyone with Domain Owner access —
  // the Domain Owner report embeds a registrar card that calls this same free lookup.
  if (user && !userCan(user, 'whois') && !userCan(user, 'domain_owner')) {
    res.status(403).json({ error: "You don't have access to the Whois module — ask an admin to enable it." });
    return;
  }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Use GET' }); return; }

  const domain = String(req.query.domain || req.query.q || '').trim();
  if (!domain) { res.status(400).json({ error: 'Provide a domain (?domain=example.com).' }); return; }
  try {
    const result = await whoisLookup(domain);
    res.status(200).json(result);
  } catch (e) {
    res.status(400).json({ error: (e && e.message) || String(e) });
  }
}
