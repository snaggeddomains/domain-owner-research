import { activeWatches, updateWatch } from '../../lib/db/beeper.js';
import { rdapStatus, describeStatus, inDeletionLifecycle } from '../../lib/beeper/rdap.js';
import { isDue } from '../../lib/beeper/cadence.js';
import { getUser } from '../../lib/db/users.js';
import { createNotification } from '../../lib/db/notifications.js';
import { sendEmail, isEmailConfigured } from '../../lib/email.js';
import whoisSource from '../../lib/sources/whois.js';

// Authoritative port-43 WHOIS cross-check used to CONFIRM a drop before alerting.
// RDAP not-found alone is unreliable: some registries (notably Identity Digital —
// .computer/.io/etc.) PURGE the RDAP record during pendingDelete while the domain
// is still registered and NOT registerable, so a pure RDAP 404 cries wolf (this
// is the agent.computer false drop). WHOIS still shows the registration in that
// window, so it's the tiebreaker. Returns:
//   true  → still registered (registrar/created/status present) → NOT dropped
//   false → no registration found ("No match") → consistent with a real drop
//   null  → WHOIS failed/inconclusive → caller falls back to RDAP (never delay a
//           genuine .com drop just because WHOIS was momentarily flaky)
const WHOIS_FREE_RE = /no match|not found|no data found|no entries found|no object found|status:\s*free|available for registration|domain not registered/i;
async function whoisStillRegistered(domain) {
  try {
    const w = await whoisSource.run({ domain });
    if (!w) return null;
    if (WHOIS_FREE_RE.test(w.raw || '')) return false;
    return Boolean(w.registrar || w.created || (w.status && w.status.length));
  } catch {
    return null;
  }
}

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
      const nowIso = new Date().toISOString();
      const patch = {
        last_status: s.available ? [] : s.statuses,
        last_http: s.code,
        last_checked: nowIso,
        // Persist the expiration date so the cadence can taper toward it (best-
        // effort column; updateWatch drops it gracefully if not yet migrated).
        ...(s.expiration ? { expiration: s.expiration } : {}),
      };
      let kind = null;

      if (s.available) {
        // RDAP returned not-found. A SINGLE 404 during pendingDelete/redemption
        // (or RDAP↔registry propagation lag) is frequently a FALSE drop — the name
        // still shows registered in authoritative WHOIS and isn't registerable
        // (this bit us on agent.computer). So require the not-found to PERSIST
        // across two consecutive checks before declaring the drop.
        if (w.status === 'dropped') {
          await updateWatch(w.id, { last_checked: nowIso }); // already alerted
          continue;
        }
        if (w.status === 'pending_drop') {
          // 2nd consecutive RDAP not-found. Before declaring the drop, cross-check
          // authoritative WHOIS — registries that purge RDAP during pendingDelete
          // (Identity Digital: .computer/.io/…) would otherwise cry wolf. If WHOIS
          // still shows it registered, it has NOT dropped → keep confirming, no
          // alert. WHOIS inconclusive (null) → trust the RDAP confirmation.
          const stillReg = await whoisStillRegistered(w.domain);
          if (stillReg === true) {
            patch.status = 'pending_drop';      // RDAP-404 contradicted by WHOIS → hold
          } else {
            changed++;
            patch.status = 'dropped';           // confirmed (RDAP 404 ×2 + WHOIS not-registered)
            patch.triggered_at = nowIso;
            kind = 'dropped';
          }
        } else {
          patch.status = 'pending_drop';        // first 404 → hold, no alert yet
        }
      } else {
        // Registered / in-pipeline. If we were mid-confirmation, RDAP found it
        // again → it was a false 404; silently revert to watching (no alert).
        const prevKey = w.last_http === 404 ? 'AVAILABLE' : (w.last_status || []).join('|');
        const newKey = statusKey(s.available, s.statuses);
        const hadBaseline = w.last_status !== null || w.last_http !== null;
        if (w.status === 'pending_drop') {
          patch.status = 'watching';
        } else if (hadBaseline && newKey !== prevKey) {
          changed++;
          patch.triggered_at = nowIso;
          const wasInLifecycle = w.last_http === 404 ? false : inDeletionLifecycle(w.last_status || []);
          const nowInLifecycle = inDeletionLifecycle(s.statuses);
          if (wasInLifecycle && !nowInLifecycle) { patch.status = 'resolved'; kind = 'resolved'; } // renewed → stop
          else kind = 'changed';                                                                    // still in pipeline
        }
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
