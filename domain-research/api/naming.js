import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { isNamingDbConfigured } from '../lib/db/supabase-naming.js';
import { parseBrief } from '../lib/naming/brief.js';
import { searchUniverse } from '../lib/naming/query.js';

export const config = { maxDuration: 30 };

// Single endpoint for the v1 Naming Exercise (spec §1-5). Action-multiplexed
// so the whole feature stays within one serverless function:
//   POST { action: 'search', brief: '...' } → { filters, buyReady, stretch }
//   POST { action: 'export', brief, results } → 501 unless Google service
//                                               account env is configured
// CSV export lives entirely in the browser (§5.2), no backend needed.
export default async function handler(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const user = await currentUser(req);
  if (user && !userCan(user, 'naming')) {
    res.status(403).json({ error: "You don't have access to the Naming module — ask an admin to enable it." });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const action = String(body.action || 'search');

  if (action === 'search') return handleSearch(body, res);
  if (action === 'export') return handleExport(body, res);
  res.status(400).json({ error: `Unknown action: ${action}` });
}

async function handleSearch(body, res) {
  const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
  if (!brief) {
    res.status(400).json({ error: 'Brief is required' });
    return;
  }
  if (!isNamingDbConfigured()) {
    res.status(500).json({ error: 'Server is missing SUPABASE_NAMING_URL / SUPABASE_NAMING_SERVICE_KEY' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY' });
    return;
  }
  let filters;
  try {
    filters = await parseBrief(brief, process.env);
  } catch (e) {
    res.status(502).json({ error: `Couldn't parse your brief: ${e.message || e}` });
    return;
  }
  let results;
  try {
    results = await searchUniverse(filters);
  } catch (e) {
    res.status(502).json({ error: `Universe query failed: ${e.message || e}` });
    return;
  }
  res.status(200).json({ filters, ...results });
}

// Google Sheets export (§5.1). The spec calls for the same
// GOOGLE_SERVICE_ACCOUNT_JSON the admin app uses. Until that env is provisioned
// on this Vercel project (and the googleapis dep is added), this returns 501
// with a clear message — the browser-side CSV export (§5.2) handles the v1
// "get the results out of the app" path on its own.
async function handleExport(_body, res) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    res.status(501).json({
      error:
        'Google Sheets export is not configured on this deployment. ' +
        'Use "Copy as CSV" for now, or set GOOGLE_SERVICE_ACCOUNT_JSON ' +
        'and wire the googleapis client to enable sheet export.',
    });
    return;
  }
  // Intentionally not implemented in this PR — the dep + service-account
  // plumbing is a follow-up. Leaving the action shape stable so the frontend
  // export button keeps working once the backend lands.
  res.status(501).json({ error: 'Sheet export endpoint stub — implementation pending' });
}
