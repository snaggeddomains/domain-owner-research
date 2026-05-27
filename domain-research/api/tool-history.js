import { isAuthed } from '../lib/auth.js';
import { saveToolLookup, listToolLookups, getToolLookup } from '../lib/db/tools.js';

// Server-backed history for the standalone tools (Trademark, Appraisal):
//   GET  /api/tool-history?kind=tm                -> recent 5 { query, updated_at }
//   GET  /api/tool-history?kind=tm&query=percent  -> one saved result { found, data }
//   POST /api/tool-history  { kind, query, data } -> upsert a result
export const config = { maxDuration: 10 };

const KINDS = new Set(['tm', 'ap']);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const kind = String(body.kind || '');
    const query = String(body.query || '').trim();
    if (!KINDS.has(kind) || !query) {
      res.status(400).json({ error: 'Provide kind ("tm"|"ap") and query' });
      return;
    }
    const id = await saveToolLookup(kind, query, body.data ?? null);
    res.status(200).json({ ok: true, id });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const kind = String(req.query.kind || '');
  if (!KINDS.has(kind)) {
    res.status(400).json({ error: 'Provide kind ("tm"|"ap")' });
    return;
  }
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  if (query) {
    const row = await getToolLookup(kind, query);
    res.status(200).json({ found: Boolean(row), data: row ? row.data : null, updated_at: row ? row.updated_at : null });
    return;
  }
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 200);
  const lookups = await listToolLookups(kind, limit);
  res.status(200).json({ lookups });
}
