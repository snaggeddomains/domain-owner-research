// Expiring .ai — the SNAP "which good one-word .ai names are about to drop" report.
// Reads the curated watchlist for names currently in the redemption / pending-delete
// window (investor-parked names excluded by default). Gated by the `expiring` module
// (admins auto-pass). Read-only; the cron does the scanning.
//
//   GET /api/expiring                → { configured, stats, rows }
//   GET /api/expiring?parked=1        → include likely-investor (parked-NS) names
//   GET /api/expiring?dismissed=1     → include dismissed names
//   POST { action:'dismiss'|'undismiss', domain }
//   POST { action:'seed', domains:'rica.ai dealt.ai …' }  → add + scan specific names NOW
import { isAuthed, requireUser, userCan } from '../lib/auth.js';
import { redemptionList, stats, setDismissed, isConfigured, insertCandidate, updateCandidate } from '../lib/db/expiringAi.js';
import { phaseLabel, inRedemptionWindow } from '../lib/expiring/redemption.js';
import { looksParked } from '../lib/expiring/candidates.js';
import { fullTldDemand } from '../lib/expiring/demand.js';
import { rdapStatus } from '../lib/beeper/rdap.js';

export const config = { maxDuration: 30 };

// Manually add + immediately RDAP-scan specific .ai names (bypasses the alphabetical
// curation walk + quality gate — a human explicitly wants these watched). Bounded.
async function seedDomains(raw) {
  const list = [...new Set(String(raw || '')
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter(Boolean)
    .map((d) => (d.includes('.') ? d : `${d}.ai`)))].slice(0, 25);
  const out = [];
  for (const d of list) {
    const sld = d.split('.')[0];
    if (!/^[a-z.]+$/.test(d) || !/^[a-z]+$/.test(sld)) { out.push({ domain: d, error: 'not a clean one-word name' }); continue; }
    await insertCandidate({ domain: d, sld, nameservers: [], parked: false });
    const s = await rdapStatus(d).catch(() => null);
    if (!s || !s.ok) { out.push({ domain: d, phase: 'unknown' }); continue; }
    const inWin = !s.available && inRedemptionWindow(s.statuses);
    const ns = Array.isArray(s.nameservers) ? s.nameservers : [];
    const nowIso = new Date().toISOString();
    // For a seeded name that's in redemption, compute the full TLD demand (matches the
    // TLD Count tool) so it shows a real number — a manual add skips the curation gate.
    const full = inWin ? await fullTldDemand(sld, process.env) : null;
    await updateCandidate(d, {
      last_status: s.available ? [] : s.statuses, last_http: s.code, last_checked: nowIso,
      available: Boolean(s.available), in_redemption: inWin, nameservers: ns, parked: ns.length ? looksParked(ns) : false,
      ...(s.expiration ? { expiration: s.expiration } : {}),
      ...(inWin ? { redemption_since: nowIso } : {}),
      ...(full != null ? { tld_count: full } : {}),
    });
    out.push({ domain: d, phase: phaseLabel(s), in_redemption: inWin, available: Boolean(s.available), expiration: s.expiration || null });
  }
  return out;
}

function canUse(user) {
  return userCan(user, 'expiring') || userCan(user, 'admin');
}

// Shape a stored row for the UI (compute a phase label + days-to-expiry).
function shape(r) {
  const s = { ok: true, available: r.available, statuses: r.last_status || [] };
  const exp = r.expiration ? Date.parse(r.expiration) : NaN;
  const days = Number.isNaN(exp) ? null : Math.round((exp - Date.now()) / 86_400_000);
  return {
    domain: r.domain,
    sld: r.sld,
    tld_count: r.tld_count == null ? null : r.tld_count,
    phase: r.available ? 'dropped' : phaseLabel(s),
    in_redemption: r.in_redemption,
    available: r.available,
    statuses: r.last_status || [],
    expiration: r.expiration || null,
    days_to_expiry: days,
    redemption_since: r.redemption_since || null,
    last_checked: r.last_checked || null,
    parked: r.parked,
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await requireUser(req, res);
  if (!user) return;
  if (!canUse(user)) { res.status(403).json({ error: "You don't have access to this tool" }); return; }

  if (req.method === 'POST') {
    const b = req.body || {};
    if (b.action === 'seed') {
      try { res.status(200).json({ ok: true, seeded: await seedDomains(b.domains) }); }
      catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
      return;
    }
    const domain = String(b.domain || '').toLowerCase().trim();
    if (!domain || (b.action !== 'dismiss' && b.action !== 'undismiss')) {
      res.status(400).json({ error: 'action (dismiss|undismiss|seed) required' });
      return;
    }
    try { await setDismissed(domain, b.action === 'dismiss'); res.status(200).json({ ok: true }); }
    catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
    return;
  }

  if (!isConfigured()) { res.status(200).json({ configured: false, stats: null, rows: [] }); return; }
  const hideParked = req.query.hideParked === '1';
  const includeDismissed = req.query.dismissed === '1';
  try {
    const [rows, st] = await Promise.all([
      redemptionList({ hideParked, includeDismissed }),
      stats(),
    ]);
    res.status(200).json({ configured: true, stats: st, rows: rows.map(shape) });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
