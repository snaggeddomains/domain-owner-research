// SNAP Research report API — the dictionary-walk candidate list (valuable one-word .coms whose
// owner has likely let them go). Gated by `snap_research` (admins auto-pass). GET → stats +
// candidate rows; POST {action:'dismiss'|'undismiss', domain}.

import { isAuthed, requireUser, userCan } from '../lib/auth.js';
import { snapCandidateList, snapStats, setSnapDismissed, snapResearchConfigured, getSnapRow, markSnapAddedDeal } from '../lib/db/snapResearch.js';
import { VALUE_FLOOR, ABANDON_FLOOR, TLD_PROBE_ABANDON_MIN } from '../lib/snapResearch/score.js';
import { corpusListedSet } from '../lib/snapResearch/corpus.js';
import { inngest, RUN_REQUESTED } from '../lib/inngest/client.js';
import { listRuns, createRun } from '../lib/db/runs.js';

// Kick a FREE Domain Owner pre-flight report for a domain (dedup against an existing run), so a
// name added to SNAP Deals gets a report auto-started. Mirrors api/internal/kick-research.js.
// Best-effort — never blocks/fails the add.
async function kickFreeReport(domain) {
  try {
    const runs = await listRuns({ q: domain, limit: 10, statuses: ['queued', 'running', 'done'], reportStatuses: ['error'] });
    if (runs.find((r) => String(r.domain).toLowerCase() === domain)) return;
    const runId = await createRun({ domain });
    await inngest.send({ name: RUN_REQUESTED, data: { runId, domain, phase: 'shallow' } });
  } catch { /* best-effort */ }
}

export const config = { maxDuration: 30 };

function canUse(user) {
  return userCan(user, 'snap_research') || userCan(user, 'admin');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await requireUser(req, res);
  if (!user) return;
  if (!canUse(user)) { res.status(403).json({ error: "You don't have access to this tool" }); return; }

  if (req.method === 'POST') {
    const b = req.body || {};
    const domain = String(b.domain || '').toLowerCase().trim();

    // One-click → SNAP Deals (Sam's acquisition board, in the admin app). Creates a native
    // snap_deal via the admin internal endpoint + marks the row so the button flips.
    if (b.action === 'add_deal') {
      if (!domain) { res.status(400).json({ error: 'domain required' }); return; }
      const secret = process.env.RESEARCH_INTERNAL_SECRET;
      const base = process.env.ADMIN_INTERNAL_BASE || 'https://app.snagged.com';
      if (!secret) { res.status(503).json({ error: 'SNAP Deals bridge not configured' }); return; }
      try {
        const r = await getSnapRow(domain);
        const notes = r
          ? `From SNAP Research — value ${r.value_score}/100, abandonment ${r.abandon_score}/100. Site: ${r.site_status}${r.stale_year ? `, stale ©${r.stale_year}` : ''}${r.tld_count != null ? `, ${r.tld_count} TLDs` : ''}${r.unchanged_years ? `, unchanged ~${r.unchanged_years}yr` : ''}.`
          : 'From SNAP Research.';
        const resp = await fetch(`${base}/api/internal/snap-deal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
          body: JSON.stringify({ domain, notes, source: 'snap_research' }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || data.error) { res.status(502).json({ error: data.error || `admin create failed (${resp.status})` }); return; }
        await markSnapAddedDeal(domain);
        // Auto-start a FREE Domain Owner report for the name so the SNAP deal has research to
        // work from (owner intel to dig up + reach). Best-effort, deduped.
        await kickFreeReport(domain);
        res.status(200).json({ ok: true, url: data.url || null, id: data.id || null });
      } catch (e) { res.status(502).json({ error: String((e && e.message) || e) }); }
      return;
    }

    if (!domain || (b.action !== 'dismiss' && b.action !== 'undismiss')) {
      res.status(400).json({ error: 'action (dismiss|undismiss|add_deal) + domain required' });
      return;
    }
    try { await setSnapDismissed(domain, b.action === 'dismiss'); res.status(200).json({ ok: true }); }
    catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
    return;
  }

  if (!snapResearchConfigured()) { res.status(200).json({ ok: true, configured: false, stats: null, rows: [] }); return; }

  const q = req.query || {};
  const all = q.all === '1';
  const includeDismissed = q.dismissed === '1';
  try {
    const [stats, rowsRaw] = await Promise.all([
      snapStats(),
      snapCandidateList({ limit: q.limit ? Number(q.limit) : 300, all, includeDismissed }),
    ]);
    let rows = rowsRaw;
    // CORPUS DISQUALIFIER (live) — drop any candidate already listed for sale / tracked / owned
    // in our corpus (Afternic/Sedo/marketplace feeds → name_universe, or the Master list). This
    // cleans the candidate backlog immediately, without waiting for each row to be re-scanned
    // (the scan applies the same gate going forward). Not applied to the "show all scanned" view.
    if (!all) {
      try {
        const listed = await corpusListedSet(rows.map((r) => r.domain));
        if (listed.size) {
          const before = rows.length;
          rows = rows.filter((r) => !listed.has(String(r.domain).toLowerCase()));
          if (stats && typeof stats.candidates === 'number') {
            stats.candidates = Math.max(0, stats.candidates - (before - rows.length));
          }
        }
      } catch { /* fail-open — show the unfiltered candidates */ }
    }
    const criteria = { valueFloor: VALUE_FLOOR, abandonFloor: ABANDON_FLOOR, tldProbeAbandonMin: TLD_PROBE_ABANDON_MIN };
    res.status(200).json({ ok: true, configured: true, stats, rows, criteria });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
