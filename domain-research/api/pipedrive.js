// Add to Pipedrive — turns a research surface (owner lookup / appraisal / whois) into a
// buy-side deal. Pipedrive's API token lives only in snagged-admin, so this endpoint is a
// thin, gated proxy to the admin internal endpoint (lib/pipedrive.js does the call).
//
//   GET  /api/pipedrive                      → { assignees:[{name,email}], sources:[label] }
//   POST /api/pipedrive  { domain, source, … } → { ok, dealId, created, url, notified }
//
// Gated by the `pipedrive` module permission (admins auto-pass).

import { isAuthed, requireUser, userCan } from '../lib/auth.js';
import { withCategory } from '../lib/db/usage.js';
import { pipedriveConfigured, pipedriveMeta, createBuyDeal } from '../lib/pipedrive.js';
import { cleanDomainInput } from '../lib/util.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await requireUser(req, res);
  if (!user) return;
  if (!userCan(user, 'pipedrive')) {
    res.status(403).json({ error: "You don't have access to this tool" });
    return;
  }
  if (!pipedriveConfigured()) {
    res.status(503).json({ error: 'Pipedrive is not configured on this server.' });
    return;
  }

  // GET — drawer metadata (assignable owners + Source/Channel labels) +, when a
  // ?domain= is passed, whether a deal already exists for it (deal:{id,url,…}|null).
  if (req.method === 'GET') {
    try {
      let d = '';
      try { d = req.query.domain ? cleanDomainInput(String(req.query.domain)) : ''; } catch { d = ''; }
      const meta = await pipedriveMeta(d || undefined);
      res.status(200).json({ ok: true, ...meta });
    } catch (e) {
      res.status(502).json({ error: String((e && e.message) || e) });
    }
    return;
  }

  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const domain = cleanDomainInput(body.domain || '');
  if (!domain || !domain.includes('.')) { res.status(400).json({ error: 'Provide a full domain' }); return; }
  const source = String(body.source || '').trim();
  if (!source) { res.status(400).json({ error: 'Pick a source / channel' }); return; }

  // Only forward the fields the admin BuyDealInput understands (fail-open on the rest).
  const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) && n > 0 ? n : undefined; };
  const str = (v) => { const s = String(v ?? '').trim(); return s || undefined; };
  const input = {
    domain,
    source,
    buyerEmail: str(body.buyerEmail),
    buyerName: str(body.buyerName),
    orgName: str(body.orgName),
    assigneeEmail: str(body.assigneeEmail),
    budgetRange: str(body.budgetRange),
    appraisalValue: num(body.appraisalValue),
    askingPrice: num(body.askingPrice),
    priority: str(body.priority),
    likelyOwner: str(body.likelyOwner),
    ownerContact: str(body.ownerContact),
    reportLink: str(body.reportLink),
    reachability: str(body.reachability),
  };

  try {
    const result = await withCategory('pipedrive', () => createBuyDeal(input));
    res.status(200).json(result);
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) });
  }
}
