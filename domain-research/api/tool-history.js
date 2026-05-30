import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { saveToolLookup, listToolLookups, getToolLookup } from '../lib/db/tools.js';

const KIND_MODULE = { tm: 'trademark', ap: 'appraisal', mk: 'domain_owner' };

// Server-backed history for the standalone tools (Trademark, Appraisal):
//   GET  /api/tool-history?kind=tm                -> recent 5 { query, updated_at }
//   GET  /api/tool-history?kind=tm&query=percent  -> one saved result { found, data }
//   POST /api/tool-history  { kind, query, data } -> upsert a result
export const config = { maxDuration: 10 };

// tm = trademark, ap = appraisal, mk = marketplace "for sale" strip (cached so
// re-opening a report doesn't re-spend Scrape.do credits on every view).
const KINDS = new Set(['tm', 'ap', 'mk']);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  // Per-kind module-permission gate.
  const _user = await currentUser(req);
  const _kindParam = (req.method === 'POST' ? (req.body && (typeof req.body === 'string' ? JSON.parse(req.body || '{}').kind : req.body.kind)) : req.query.kind) || '';
  const _mod = KIND_MODULE[String(_kindParam)] || 'domain_owner';
  if (_user && !userCan(_user, _mod)) {
    res.status(403).json({ error: `You don't have access to the ${_mod} module` });
    return;
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const kind = String(body.kind || '');
    const query = String(body.query || '').trim();
    if (!KINDS.has(kind) || !query) {
      res.status(400).json({ error: 'Provide kind ("tm"|"ap"|"mk") and query' });
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
    res.status(400).json({ error: 'Provide kind ("tm"|"ap"|"mk")' });
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
