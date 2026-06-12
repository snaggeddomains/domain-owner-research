import { activeWatches, updateWatch } from '../../lib/db/beeper.js';
import { rdapStatus, describeStatus, inDeletionLifecycle } from '../../lib/beeper/rdap.js';
import { isDue } from '../../lib/beeper/cadence.js';
import { getUser } from '../../lib/db/users.js';
import { createNotification } from '../../lib/db/notifications.js';
import { sendEmail, isEmailConfigured } from '../../lib/email.js';

// Beeper poller — runs every minute (vercel.json cron). For each active watch it
// reads the domain's RDAP status and, the moment it CHANGES (new EPP status, or
// the domain DROPS to available), alerts the watcher via bell + email. 1/min is
// Vercel's cron floor and well under any RDAP rate-limit, so it catches a drop
// within ~60s without risking a ban.
export const config = { maxDuration: 60 };

const statusKey = (available, statuses) => (available ? 'AVAILABLE' : (statuses || []).join('|'));

// kind: 'dropped' | 'resolved' | 'changed' | 'expired'
async function notify(watch, s, kind) {
  const domain = watch.domain;
  const headline =
    kind === 'dropped' ? `${domain} just DROPPED — it's available now 🎯`
    : kind === 'resolved' ? `${domain} renewed / re-registered — it's no longer heading to drop. Watch stopped.`
    : kind === 'expired' ? `Stopped watching ${domain} after the max watch window. Re-add it if you still want alerts.`
    : `${domain} status changed → ${describeStatus(s)}`;
  // Bell notification (best-effort; table may be absent).
  try {
    if (watch.user_id) {
      await createNotification({
        user_id: watch.user_id, kind: 'beeper',
        title: headline,
        body: kind === 'dropped' ? 'RDAP now returns NOT FOUND — go grab/backorder it.'
          : kind === 'resolved' ? 'It left the deletion lifecycle (renewed/registered).'
          : kind === 'expired' ? 'Auto-stopped after the max watch window.'
          : `New RDAP status: ${describeStatus(s)}`,
        link: `/research/beeper`,
      });
    }
  } catch { /* non-fatal */ }
  // Email (best-effort; only if the user has an address + Resend is configured).
  try {
    if (watch.user_id && isEmailConfigured()) {
      const u = await getUser(watch.user_id).catch(() => null);
      if (u && u.email && u.email !== 'legacy-admin') {
        const text = `Beeper alert for ${domain}\n\n${headline}\n\nCurrent RDAP status: ${describeStatus(s)}${s.expiration ? `\nExpiration: ${s.expiration}` : ''}\n\nManage your watches: https://research.snagged.com/research/beeper`;
        await sendEmail({
          to: u.email,
          subject: kind === 'dropped' ? `🎯 ${domain} dropped — available now`
            : kind === 'resolved' ? `${domain} renewed — Beeper stopped`
            : kind === 'expired' ? `Beeper stopped watching ${domain}`
            : `🔔 ${domain} status changed`,
          text,
          html: `<p style="font-size:15px;font-weight:700">${headline}</p><p>Current RDAP status: <strong>${describeStatus(s)}</strong>${s.expiration ? `<br>Expiration: ${s.expiration}` : ''}</p><p><a href="https://research.snagged.com/research/beeper">Manage your watches</a></p>`,
        });
      }
    }
  } catch { /* non-fatal */ }
}

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const watches = await activeWatches();
  // Adaptive cadence — only poll the watches that are DUE this tick. A name on
  // the cusp (delete pipeline / hours-to-expiry) is due every minute; a name
  // months out is due weekly/daily. Keeps RDAP load proportional to imminence.
  const now = Date.now();
  const due = watches.filter((w) => isDue(w, now));
  let checked = 0, changed = 0;
  const queue = [...due];
  async function worker() {
    while (queue.length) {
      const w = queue.shift();
      const s = await rdapStatus(w.domain).catch(() => null);
      checked++;
      if (!s || !s.ok) { await updateWatch(w.id, { last_checked: new Date().toISOString() }); continue; }
      const prevKey = w.last_http === 404 ? 'AVAILABLE' : (w.last_status || []).join('|');
      const newKey = statusKey(s.available, s.statuses);
      const hadBaseline = w.last_status !== null || w.last_http !== null;
      const patch = {
        last_status: s.available ? [] : s.statuses,
        last_http: s.code,
        last_checked: new Date().toISOString(),
        // Persist the expiration date so the cadence can taper toward it (best-
        // effort column; updateWatch drops it gracefully if not yet migrated).
        ...(s.expiration ? { expiration: s.expiration } : {}),
      };
      let kind = null;
      if (hadBaseline && newKey !== prevKey) {
        changed++;
        patch.triggered_at = new Date().toISOString();
        const wasInLifecycle = w.last_http === 404 ? false : inDeletionLifecycle(w.last_status || []);
        const nowInLifecycle = s.available ? false : inDeletionLifecycle(s.statuses);
        if (s.available) { patch.status = 'dropped'; kind = 'dropped'; }            // dropped → stop
        else if (wasInLifecycle && !nowInLifecycle) { patch.status = 'resolved'; kind = 'resolved'; } // renewed → stop
        else kind = 'changed';                                                       // still in pipeline → keep watching
      }
      // Safety cap — never poll a watch forever (tunable via BEEPER_MAX_WATCH_DAYS).
      const capDays = Number(process.env.BEEPER_MAX_WATCH_DAYS || 60);
      if (!patch.status && w.created_at && Date.now() - Date.parse(w.created_at) > capDays * 86400000) {
        patch.status = 'expired';
        if (!kind) kind = 'expired';
      }
      if (kind) await notify(w, s, kind);
      await updateWatch(w.id, patch);
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, due.length) || 1 }, worker));
  res.status(200).json({ ok: true, watching: watches.length, due: due.length, checked, changed });
}
