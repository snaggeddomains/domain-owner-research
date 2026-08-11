// Expiring .ai cron. Each tick: (1) curate a slice of the .ai zone into the
// watchlist (good one-word dictionary names, non-parked), and (2) adaptively scan
// the due candidates for the redemption drop window — near-expiry names often,
// far-out names rarely (cadence). Newly-in-redemption names alert the team
// (bell + email). CRON_SECRET-gated.
//
// Query knobs (for backfill/tuning): ?curate=N (zone rows to curate this tick),
// ?scan=N (candidates to consider), ?nocurate=1 / ?noscan=1.
import { curateSlice, seedTechLexicon, curateTechUniverse } from '../../lib/expiring/candidates.js';
import { scanDue } from '../../lib/expiring/scan.js';
import { diagnoseRedemptionStall } from '../../lib/expiring/diagnose.js';
import { getCursor, setCursor } from '../../lib/db/expiringAi.js';
import { listUsers } from '../../lib/db/users.js';
import { userCan } from '../../lib/auth.js';
import { createNotification } from '../../lib/db/notifications.js';
import { sendEmail, isEmailConfigured } from '../../lib/email.js';

export const config = { maxDuration: 60 };

const STALL_META_KEY = 'redemption_stall_alerted_at';
// Don't re-fire the stall alert every 5-min tick — re-alert at most every 12h.
const STALL_REALERT_MS = 12 * 60 * 60 * 1000;

// Fail-safe: if no name has been flagged entering redemption in 24h, auto-diagnose
// WHY and alert the team (bell + email) with the likely cause + fix, deduped to
// ~once per 12h so a persistent stall nudges but doesn't spam. Best-effort.
async function runStallFailsafe() {
  let diag;
  try { diag = await diagnoseRedemptionStall(); } catch (e) { return { error: String((e && e.message) || e) }; }
  if (!diag || !diag.ok) return { skipped: 'not-configured' };
  if (!diag.stalled) return { stalled: false, hoursSinceRedemption: diag.hoursSinceRedemption };

  // Dedupe: skip if we already alerted within the re-alert window.
  let last = 0;
  try { last = Date.parse(await getCursor(STALL_META_KEY)) || 0; } catch { last = 0; }
  if (last && Date.now() - last < STALL_REALERT_MS) {
    return { stalled: true, alerted: false, reason: 'recently-alerted', hoursSinceRedemption: diag.hoursSinceRedemption };
  }

  const title = `⚠️ Expiring .ai stalled — no new redemption in ${diag.hoursSinceRedemption}h`;
  const body = diag.summary;

  // Bell to admin/expiring users.
  try {
    const users = await listUsers();
    const recipients = (users || []).filter((u) => u && (userCan(u, 'admin') || userCan(u, 'expiring')));
    await Promise.allSettled(
      recipients.map((u) => createNotification({ user_id: u.id, kind: 'expiring', title, body, link: '/research/expiring' })),
    );
  } catch { /* non-fatal */ }

  // Email rob/sam (same recipients as the digest) so it reaches them off-screen.
  try {
    if (isEmailConfigured()) {
      const to = (process.env.EXPIRING_AI_EMAILS || 'rob@snagged.com,sam@snagged.com')
        .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
      const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const sig = diag.signals || {};
      const rows = Object.entries(sig).map(([k, v]) => `<tr><td style="padding:3px 12px;color:#4a5b66">${esc(k)}</td><td style="padding:3px 12px;font-weight:600">${esc(v == null ? '—' : v)}</td></tr>`).join('');
      const html =
        `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#26343d">
          <p style="font-size:15px;font-weight:700;margin:0 0 4px">${esc(title)}</p>
          <p style="color:#8a1c1c;font-weight:600;margin:0 0 12px">Likely cause: ${esc(diag.cause)}</p>
          <table style="border-collapse:collapse;font-size:13px;border:1px solid #e5e9ec">${rows}</table>
          <p style="margin:14px 0 0"><a href="https://research.snagged.com/research/expiring" style="display:inline-block;padding:9px 15px;background:#1f6b52;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Open Expiring .ai</a></p>
        </div>`;
      if (to.length) await sendEmail({ to, subject: title, html });
    }
  } catch { /* non-fatal */ }

  try { await setCursor(new Date().toISOString(), STALL_META_KEY); } catch { /* non-fatal */ }
  return { stalled: true, alerted: true, hoursSinceRedemption: diag.hoursSinceRedemption, cause: diag.cause };
}

// In-app bell when good .ai names newly enter redemption, for users who can see
// the report (expiring perm, or admins). The EMAIL is handled separately by the
// ~6×/day digest cron (expiring-ai-digest → rob@/sam@), so we don't double-send;
// this is just the real-time in-app nudge. Best-effort.
async function alertEntered(entered) {
  if (!entered || !entered.length) return 0;
  let recipients = [];
  try {
    const users = await listUsers();
    recipients = (users || []).filter((u) => u && (userCan(u, 'admin') || userCan(u, 'expiring')));
  } catch { recipients = []; }
  if (!recipients.length) return 0;

  const top = entered.slice(0, 25);
  const title = entered.length === 1
    ? `${top[0].domain} entered redemption 🎯`
    : `${entered.length} .ai names entered redemption 🎯`;
  const lines = top.map((e) => `• ${e.domain}${e.phase ? ` (${e.phase})` : ''}`).join('\n');
  const link = '/research/expiring';
  await Promise.allSettled(
    recipients.map((u) => createNotification({ user_id: u.id, kind: 'expiring', title, body: lines, link })),
  );
  return recipients.length;
}

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const q = req.query || {};
  const out = { ok: true };

  if (!q.nocurate) {
    try {
      // Curation is pure DB work now (no per-word DNS), so the slice can be large.
      const pageSize = q.curate ? Math.min(Math.max(Number(q.curate) || 0, 1), 10000) : undefined;
      out.curate = await curateSlice({ pageSize });
    } catch (e) { out.curate = { error: String((e && e.message) || e) }; }
    // Tech expansion: seed the curated AI/tech lexicon (version-gated) + pull tech-category
    // SLDs from name_universe. Both best-effort — they give the .ai TLD-matching names scan
    // priority so they surface first. (?notech=1 to skip.)
    if (!q.notech) {
      try { out.techSeed = await seedTechLexicon(); } catch (e) { out.techSeed = { error: String((e && e.message) || e) }; }
      try { out.techUniverse = await curateTechUniverse(); } catch (e) { out.techUniverse = { error: String((e && e.message) || e) }; }
    }
  }
  if (!q.noscan) {
    try {
      const scan = await scanDue({ limit: Number(q.scan) || undefined });
      out.scan = { batch: scan.batch, due: scan.due, checked: scan.checked, entered: scan.entered.length, dropped: scan.dropped.length };
      out.notified = await alertEntered(scan.entered);
      out.entered = scan.entered.slice(0, 25);
      out.dropped = scan.dropped.slice(0, 25);
    } catch (e) { out.scan = { error: String((e && e.message) || e) }; }
  }

  // Fail-safe: auto-diagnose + alert if no name has entered redemption in 24h
  // (unless explicitly skipped for a backfill/tuning tick with ?nofailsafe=1).
  if (!q.nofailsafe) {
    try { out.failsafe = await runStallFailsafe(); } catch (e) { out.failsafe = { error: String((e && e.message) || e) }; }
  }
  res.status(200).json(out);
}
