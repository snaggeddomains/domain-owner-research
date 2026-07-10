// Bulk Eval — rank a whole list of domains by investability (est. resale vs asking
// price) using the FAST deterministic scorer (no paid per-name calls). The heavy paid
// evaluation stays a per-name drill-down (the SNAP Eval tool).
//
//   POST { names: [{ domain, price? }] }  → { results, has_prices, count }
//
// Gated by research.bulk_eval. maxDuration 60. Capped at 500 names/request.

import { isAuthed, requirePermission } from '../lib/auth.js';
import { withCategory } from '../lib/db/usage.js';
import { bulkEvaluate } from '../lib/evaluate/bulkScore.js';
import { fetchSheetNames } from '../lib/evaluate/sheetImport.js';

export const config = { maxDuration: 60 };

const MAX_NAMES = 500;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const user = await requirePermission(req, res, 'research.bulk_eval');
  if (!user) return; // requirePermission already wrote 401/403

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    res.status(400).json({ error: 'Bad JSON' });
    return;
  }

  // Import mode: read domains (+ optional prices) from a Google Sheets link and return
  // them for the client to review (does NOT score — the user hits Evaluate after).
  if (body.sheet_url && !Array.isArray(body.names)) {
    try {
      const parsed = await fetchSheetNames(body.sheet_url, { max: MAX_NAMES });
      res.status(200).json({ ok: true, parsed: true, ...parsed });
    } catch (e) {
      res.status(400).json({ error: String((e && e.message) || e) });
    }
    return;
  }

  const names = Array.isArray(body.names) ? body.names.slice(0, MAX_NAMES) : [];
  if (!names.length) {
    res.status(400).json({ error: 'No names provided.' });
    return;
  }

  try {
    const out = await withCategory('bulk_eval', () => bulkEvaluate(names, process.env));
    res.status(200).json({ ok: true, ...out, capped: Array.isArray(body.names) && body.names.length > MAX_NAMES });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
