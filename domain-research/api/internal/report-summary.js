// Internal, server-to-server: the clean, structured "bottom line" for a domain so the admin
// Deals CRM can auto-fill a deal's sidebar (likely owner / owner contact / appraisal) once the
// Domain Owner report (and/or an appraisal) has been run — instead of re-typing it by hand.
//
//   GET ?domain=<d>   header x-internal-secret: RESEARCH_INTERNAL_SECRET
//   → { ok, likely_owner, owner_type, owner_contact, summary, appraisal:{mid,low,high}|null }
//
// Owner fields come from the newest DONE run's report PART-1 (via summarizeReport — a shallow
// pre-flight with no PART-1 just yields nulls). Appraisal is the cache-first Appraise.net value.
// Auth = the shared secret, same as valuate / kick-research. All fields fail-open to null.

import { listRuns, getRun } from '../../lib/db/runs.js';
import { summarizeReport, extractReportJson } from '../../lib/reportSummary.js';
import { appraisalOnly } from '../../lib/evaluate/signals.js';

export const config = { maxDuration: 30 };

// Best owner-reachable contact from the report's PART-1 contacts[] (primary tier first).
function pickOwnerContact(report) {
  const json = extractReportJson(report && report.markdown);
  const contacts = Array.isArray(json && json.contacts) ? json.contacts : [];
  const pick = (types, tier) => {
    const c = contacts.find((x) => x && x.value
      && types.includes(String(x.type || '').toLowerCase())
      && (!tier || x.tier === tier));
    return c ? String(c.value).trim() : null;
  };
  const email = pick(['email'], 'primary') || pick(['email']);
  const phone = pick(['phone'], 'primary') || pick(['phone']);
  return [email, phone].filter(Boolean).join(' · ') || null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.RESEARCH_INTERNAL_SECRET;
  if (!secret || req.headers['x-internal-secret'] !== secret) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  let domain = '';
  try { domain = String((req.query && req.query.domain) || '').trim().toLowerCase(); } catch { domain = ''; }
  if (!domain || !domain.includes('.')) { res.status(400).json({ error: 'a valid domain is required' }); return; }

  const out = { ok: true, likely_owner: null, owner_type: null, owner_contact: null, summary: null, appraisal: null };
  try {
    // Owner fields — newest DONE run's report PART-1 (best-effort).
    const runs = await listRuns({ q: domain, limit: 10, statuses: ['done'] });
    const hit = runs.find((r) => String(r.domain).toLowerCase() === domain);
    if (hit) {
      const run = await getRun(hit.id);
      const report = run && run.report;
      if (report) {
        const s = summarizeReport(report);
        out.likely_owner = s.likelyOwner || null;
        out.owner_type = s.ownerType || null;
        out.summary = s.summary || null;
        out.owner_contact = pickOwnerContact(report);
      }
    }
  } catch { /* owner stays null */ }

  try {
    const a = await appraisalOnly(domain, process.env);
    if (a && a.mid > 0) out.appraisal = { mid: a.mid, low: a.low || null, high: a.high || null };
  } catch { /* appraisal stays null */ }

  res.status(200).json(out);
}
