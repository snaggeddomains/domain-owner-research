import { isAuthed, requirePermission } from '../lib/auth.js';
import { getDomainNotes, saveDomainNotes } from '../lib/db/notes.js';

// Per-domain user notes on a Domain Owner report. Notes persist across re-runs
// (keyed by domain) and are ingested by the agent on a rerun. Gated by the same
// `domain_owner` access as the report itself.
//   GET  ?domain=example.com           -> { notes, updated_at, updated_by }
//   POST { domain, notes }             -> save
export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await requirePermission(req, res, 'domain_owner');
  if (!user) return; // requirePermission already responded

  if (req.method === 'GET') {
    const domain = String(req.query.domain || '').trim();
    if (!domain) { res.status(400).json({ error: 'Provide ?domain=' }); return; }
    try {
      res.status(200).json({ ok: true, domain, ...(await getDomainNotes(domain)) });
    } catch (e) {
      res.status(200).json({ ok: true, domain, notes: '', updated_at: null, updated_by: null, warn: String(e?.message || e) });
    }
    return;
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const domain = String(body.domain || '').trim();
    if (!domain) { res.status(400).json({ error: 'Provide a domain' }); return; }
    try {
      const saved = await saveDomainNotes(domain, body.notes || '', (user && user.email) || null);
      res.status(200).json({ ok: true, domain, ...saved });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
    return;
  }

  res.status(405).json({ error: 'Use GET or POST' });
}
