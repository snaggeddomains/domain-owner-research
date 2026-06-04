// Nameserver Search API — read-only lookups over the zone-file index
// (`zone_domains` in the NAMING project). Gated by the `nameserver` module
// permission (admins always pass).
//
//   GET ?mode=domain&domain=pizza.com
//        → { domain, nameservers: [...] }
//   GET ?mode=ns&ns=ns1.x.com,ns2.x.com&match=all|any&tld=com&limit=&offset=
//        → { rows: [{domain,tld,nameservers}], hasMore }
//   GET ?mode=pairing&domain=pizza.com&limit=&offset=
//        → { domain, nameservers, rows, hasMore }  (siblings on the same NS set)

import { currentUser, userCan } from '../lib/auth.js';
import { normalizeDomain } from '../lib/util.js';
import {
  isConfigured, lookupDomain, domainsByNameservers, samePairing, parseNsList,
} from '../lib/nameserver/query.js';
import { analyzeRelated } from '../lib/nameserver/relate.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed — use GET' });
    return;
  }

  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (!userCan(user, 'nameserver')) {
    res.status(403).json({ error: 'You don’t have access to Nameserver Search.' });
    return;
  }

  if (!isConfigured()) {
    res.status(503).json({ error: 'Nameserver index not configured (naming Supabase env vars missing).' });
    return;
  }

  const q = req.query || {};
  const mode = (q.mode || 'domain').toString();

  try {
    if (mode === 'domain') {
      const domain = normalizeDomain((q.domain || '').toString());
      if (!domain) { res.status(400).json({ error: 'Enter a domain to look up.' }); return; }
      const row = await lookupDomain(domain);
      res.status(200).json({
        mode, domain,
        found: Boolean(row),
        nameservers: (row && row.nameservers) || [],
        tld: (row && row.tld) || null,
      });
      return;
    }

    if (mode === 'ns') {
      const nameservers = parseNsList((q.ns || '').toString());
      if (!nameservers.length) { res.status(400).json({ error: 'Enter at least one nameserver.' }); return; }
      const match = (q.match || 'all').toString() === 'any' ? 'any' : 'all';
      const tld = (q.tld || '').toString();
      const limit = q.limit;
      const offset = q.offset;
      const { rows, hasMore } = await domainsByNameservers({ nameservers, mode: match, tld, limit, offset });
      res.status(200).json({ mode, nameservers, match, tld: tld || null, rows, hasMore, count: rows.length });
      return;
    }

    if (mode === 'pairing') {
      const domain = normalizeDomain((q.domain || '').toString());
      if (!domain) { res.status(400).json({ error: 'Enter a domain to find its pairing.' }); return; }
      const out = await samePairing(domain, { limit: q.limit, offset: q.offset });
      res.status(200).json({ mode, ...out, count: out.rows.length });
      return;
    }

    // Relatedness intelligence: find the pairing, then ask the LLM which siblings
    // are thematically tied to the seed (the triangulation shortlist).
    if (mode === 'relate') {
      const domain = normalizeDomain((q.domain || '').toString());
      if (!domain) { res.status(400).json({ error: 'Enter a domain to analyze.' }); return; }
      const pairing = await samePairing(domain, { limit: q.limit, offset: q.offset });
      if (!pairing.found) {
        res.status(200).json({ mode, domain, found: false, nameservers: [], related: [], summary: 'Domain not found in the zone index.' });
        return;
      }
      const analysis = await analyzeRelated(domain, pairing.rows);
      res.status(200).json({
        mode,
        domain: pairing.domain,
        nameservers: pairing.nameservers,
        siblingCount: pairing.rows.length,
        hasMore: pairing.hasMore,
        related: analysis.related,
        summary: analysis.summary,
        model: analysis.model,
      });
      return;
    }

    res.status(400).json({ error: `Unknown mode "${mode}" — use domain, ns, pairing, or relate.` });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}
