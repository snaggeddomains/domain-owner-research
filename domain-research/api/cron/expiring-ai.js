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
import { listUsers } from '../../lib/db/users.js';
import { userCan } from '../../lib/auth.js';
import { createNotification } from '../../lib/db/notifications.js';

export const config = { maxDuration: 60 };

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
  res.status(200).json(out);
}
