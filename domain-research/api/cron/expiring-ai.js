// Expiring .ai cron. Each tick: (1) curate a slice of the .ai zone into the
// watchlist (good one-word dictionary names, non-parked), and (2) adaptively scan
// the due candidates for the redemption drop window — near-expiry names often,
// far-out names rarely (cadence). Newly-in-redemption names alert the team
// (bell + email). CRON_SECRET-gated.
//
// Query knobs (for backfill/tuning): ?curate=N (zone rows to curate this tick),
// ?scan=N (candidates to consider), ?nocurate=1 / ?noscan=1.
import { curateSlice } from '../../lib/expiring/candidates.js';
import { scanDue } from '../../lib/expiring/scan.js';
import { listUsers } from '../../lib/db/users.js';
import { userCan } from '../../lib/auth.js';
import { createNotification } from '../../lib/db/notifications.js';
import { sendEmail, isEmailConfigured } from '../../lib/email.js';

export const config = { maxDuration: 60 };

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Alert the team when good .ai names newly enter redemption. Recipients = users
// who can see the report (expiring perm, or admins). Best-effort.
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
  const emailOn = isEmailConfigured();
  await Promise.allSettled(
    recipients.flatMap((u) => {
      const jobs = [createNotification({ user_id: u.id, kind: 'expiring', title, body: lines, link })];
      if (emailOn && u.email && u.email !== 'legacy-admin') {
        jobs.push(sendEmail({
          to: u.email,
          subject: `🎯 ${title}`,
          text: `Good one-word .ai names just entered the redemption window (about to drop):\n\n${lines}\n\nSee the list: https://research.snagged.com/research/expiring`,
          html: `<p style="font-size:15px;font-weight:700">${esc(title)}</p>`
            + `<p style="color:#4a5b66">Good one-word .ai names just entered the redemption window (about to drop):</p>`
            + `<ul>${top.map((e) => `<li><strong>${esc(e.domain)}</strong>${e.phase ? ` — ${esc(e.phase)}` : ''}</li>`).join('')}</ul>`
            + `<p><a href="https://research.snagged.com/research/expiring">See the full list</a></p>`,
        }));
      }
      return jobs;
    }),
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
      out.curate = await curateSlice({ pageSize: Number(q.curate) || undefined });
    } catch (e) { out.curate = { error: String((e && e.message) || e) }; }
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
