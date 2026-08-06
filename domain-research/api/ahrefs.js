// Ahrefs Report — a comprehensive website deep-dive from Ahrefs Site Explorer v3:
// overview (DR, organic traffic/value/keywords, backlinks/refdomains), a monthly
// traffic history with per-week/month/quarter/year rollups + MoM/YoY, traffic by
// country, the keywords it ranks for, top pages, referring domains, and organic
// competitors. Every section is fail-open (a section that errors is just omitted).
//
//   GET /api/ahrefs?domain=<d>[&country=us][&refresh=1]  → the full report
//   GET /api/ahrefs?list=1[&limit=10]                    → recent reports
//
// Cache-first by DOMAIN (kind 'ah' in domain_research_tool_lookups) — the paid pull
// happens once per domain; a re-view serves from cache. `refresh=1` forces fresh.
// Gated by the `ahrefs` module (admins auto-pass). Needs AHREF_API_KEY.

import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { withCategory } from '../lib/db/usage.js';
import { getToolLookup, saveToolLookup, listToolLookups } from '../lib/db/tools.js';
import { ahrefsReport, ahrefsConfigured } from '../lib/ahrefs.js';

export const config = { maxDuration: 60 };
const KIND = 'ah';

const cleanDomain = (d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await currentUser(req);
  // Reports-section tool — gate on the `ahrefs` module (admins auto-pass via userCan).
  if (user && !userCan(user, 'ahrefs')) {
    res.status(403).json({ error: "You don't have access to the Ahrefs Report." });
    return;
  }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Use GET' }); return; }

  // Recent reports list.
  if (req.query.list) {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const lookups = await listToolLookups(KIND, limit).catch(() => []);
    res.status(200).json({ lookups });
    return;
  }

  if (!ahrefsConfigured(process.env)) {
    res.status(503).json({ error: 'Ahrefs is not configured (AHREF_API_KEY unset).', configured: false });
    return;
  }

  const domain = cleanDomain(req.query.domain || req.query.q);
  if (!domain) { res.status(400).json({ error: 'Provide a domain (?domain=example.com).' }); return; }
  const country = String(req.query.country || 'us').toLowerCase().slice(0, 2) || 'us';
  const refresh = req.query.refresh === '1' || req.query.refresh === 'true';

  try {
    const cached = refresh ? null : await getToolLookup(KIND, domain).catch(() => null);
    if (cached && cached.data && cached.data.overview) {
      res.status(200).json({ ...cached.data, cached: true, updated_at: cached.updated_at });
      return;
    }
    const report = await withCategory('ahrefs', () => ahrefsReport(domain, process.env, { country }));
    // Persist only a report that actually returned data (don't cache an all-errors miss).
    const hasData = report && (Object.keys(report.overview || {}).length || (report.history || []).length || (report.keywords || []).length);
    if (hasData) await saveToolLookup(KIND, domain, report).catch(() => {});
    res.status(200).json({ ...report, cached: false });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
