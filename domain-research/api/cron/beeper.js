import { activeWatches, updateWatch } from '../../lib/db/beeper.js';
import { rdapStatus, describeStatus, inDeletionLifecycle } from '../../lib/beeper/rdap.js';
import { isDue } from '../../lib/beeper/cadence.js';
import { getUser } from '../../lib/db/users.js';
import { createNotification } from '../../lib/db/notifications.js';
import { sendEmail, isEmailConfigured } from '../../lib/email.js';
import whoisSource from '../../lib/sources/whois.js';
import { fetchJson } from '../../lib/util.js';
import { domainIqCurrentWhois } from '../../lib/sources/domainiq.js';

// FINAL authoritative registered-check via DomainIQ current-WHOIS (service=whois).
// DomainIQ is the only source that still reflects the registry during an
// Identity-Digital pendingDelete (RDAP 404s and WhoisXML reports "available" —
// that's what kept false-dropping agent.computer).
//
// DomainIQ returns a STRUCTURED record: {result:{status,registrar,create_date,
// raw,…}}. For a pendingDelete name the detail fields are BLANK but the normalized
// `status` is the signal (agent.computer → "Inactive"). A truly unregistered name
// reads "available". So:
//   true  → status is anything the registry still knows ("inactive"/"active"/
//           "redemption"/…) or any record field is populated → registered (HOLD)
//   false → status explicitly "available"/unregistered → really gone (DROP)
//   null  → no result / error → caller HOLDS
const DIQ_AVAILABLE_RE = /\bavailable\b|unregistered|not\s*registered|no\s*match|\bfree\b/i;
async function domainIqRegistered(domain) {
  const body = await domainIqCurrentWhois(domain);
  const r = body && typeof body === 'object' ? body.result : null;
  if (!r || typeof r !== 'object') return null;       // no result / error → HOLD
  const status = String(r.status || '').trim();
  if (status && DIQ_AVAILABLE_RE.test(status)) return false;   // explicitly available → DROP
  // Any other known status, or a populated record field, means the registry still
  // has the name (incl. "Inactive" = in the delete pipeline) → registered → HOLD.
  if (status || r.registrar || r.create_date || r.expire_date || r.ns_1 || r.reg_email) return true;
  return null;                                         // empty/unknown → HOLD
}

// Confirm-a-drop oracle. RDAP not-found ALONE is unreliable: some registries
// (notably Identity Digital — .computer/.io/etc.) PURGE the RDAP record during
// pendingDelete while the domain is still registered and NOT registerable, so a
// pure RDAP 404 cries wolf (the agent.computer false drop). Even the AUTHORITATIVE
// registry RDAP 404s in that window — so before alerting we need a non-RDAP check.
//
// HARD-LEARNED: WhoisXML's `domainAvailability` flag ALSO reports agent.computer
// as AVAILABLE during pendingDelete (it leans on the same purged registry record),
// so trusting that flag re-fired the false drop. The RELIABLE signal is the WHOIS
// RECORD CONTENT — a registrar / creation date / EPP status (incl. "pendingDelete"
// / "redemption") means the name is STILL REGISTERED and NOT droppable. So:
//   - prioritize record content over the availability flag, and
//   - require BOTH oracles (HTTPS WhoisXML + legacy port-43 WHOIS) to find NO
//     record before declaring a drop. ANY oracle that still sees a record → HOLD.
// A drop only fires on positive "gone" agreement; uncertainty always holds.
//   { registered: true,  expiration } → still registered → NOT a drop (hold)
//   { registered: false, expiration } → no record anywhere → a real drop (alert)
//   { registered: null }              → inconclusive → caller HOLDS (never alerts)
const WHOIS_FREE_RE = /no match|not found|no data found|no entries found|no object found|status:\s*free|available for registration|domain not registered/i;
// EPP / record signals that mean "still registered" even mid delete-pipeline.
const PIPELINE_STATUS_RE = /pending\s*delete|pendingdelete|redemption|pending\s*restore|client|server|transfer prohibited|hold|inactive|ok\b/i;

async function whoisXmlRegistered(domain) {
  const key = process.env.WHOISXML_API_KEY;
  if (!key) return { registered: null, expiration: null };
  try {
    const url =
      'https://www.whoisxmlapi.com/whoisserver/WhoisService' +
      `?apiKey=${encodeURIComponent(key)}&domainName=${encodeURIComponent(domain)}&outputFormat=JSON`;
    const d = await fetchJson(url);
    const w = (d && d.WhoisRecord) || {};
    const reg = w.registryData || {};
    const expiration = reg.expiresDate || w.expiresDate || null;
    // RECORD CONTENT FIRST — a registrar / created date / any EPP status means the
    // name still exists in the registry (incl. pendingDelete) → registered. This is
    // what the `domainAvailability` flag gets WRONG for purged-RDAP TLDs.
    const statusStr = [].concat(w.status || [], reg.status || []).join(' ');
    const hasRecord = Boolean(
      w.registrarName || reg.registrarName || w.createdDate || reg.createdDate ||
      (statusStr && PIPELINE_STATUS_RE.test(statusStr)) || statusStr.trim(),
    );
    if (hasRecord) return { registered: true, expiration };
    // No record content — now trust an explicit AVAILABLE; else inconclusive.
    if (String(w.domainAvailability || '').toUpperCase() === 'AVAILABLE') return { registered: false, expiration };
    return { registered: null, expiration };
  } catch {
    return { registered: null, expiration: null };
  }
}

async function portWhoisRegistered(domain) {
  try {
    const w = await whoisSource.run({ domain });
    if (!w) return null;
    if (WHOIS_FREE_RE.test(w.raw || '')) return false;
    return Boolean(w.registrar || w.created || (w.status && w.status.length));
  } catch {
    return null;
  }
}

// → { registered: true|false|null, expiration }. A drop is declared ONLY when no
// source can find a record. ANY source that still sees a registration → hold.
//
// `trustRdapGone` distinguishes the TWO kinds of RDAP-404:
//   • RDAP-reliable TLDs (.com, .id/PANDI, most ccTLDs) keep the record through the
//     delete pipeline, so a 404 there is a GENUINE drop — trust it even if DomainIQ
//     can't confirm (DomainIQ may not even cover the ccTLD). Caller sets this true
//     when it has seen a real RDAP record for the domain (e.g. an expiration date).
//   • RDAP-purged TLDs (Identity Digital: .computer/.io/…) 404 DURING pendingDelete
//     while still registered — there a 404 is NOT trustworthy, so we require DomainIQ
//     to positively confirm "available" and HOLD on any doubt (the agent.computer fix).
async function confirmDropOracle(domain, { trustRdapGone = false } = {}) {
  const [x, p] = await Promise.all([whoisXmlRegistered(domain), portWhoisRegistered(domain)]);
  // Registered per the fast (free) oracles → hold; no need to spend a DomainIQ call.
  if (x.registered === true || p === true) return { registered: true, expiration: x.expiration };
  if (x.registered === false || p === false) {
    if (process.env.DOMAINIQ_API_KEY) {
      const diq = await domainIqRegistered(domain);
      if (diq === true) return { registered: true, expiration: x.expiration };   // DomainIQ sees a record → HOLD
      if (diq === false) return { registered: false, expiration: x.expiration }; // DomainIQ confirms gone → DROP
      // DomainIQ unknown/error: trust a reliable-RDAP 404 (real drop), else HOLD.
      return { registered: trustRdapGone ? false : true, expiration: x.expiration };
    }
    return { registered: false, expiration: x.expiration };  // no DomainIQ configured → legacy fast-oracle drop
  }
  // All inconclusive → hold.
  return { registered: null, expiration: x.expiration };
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

      // AUTO-HEAL a false drop. A watch already marked 'dropped' is re-verified for a
      // window (BEEPER_REHEAL_DAYS, see activeWatches): if a non-RDAP oracle still
      // shows it REGISTERED (an RDAP-purged pendingDelete name that never actually
      // dropped), silently revert it to held_registered — no alert, no re-add needed.
      if (w.status === 'dropped') {
        const oracle = await confirmDropOracle(w.domain, { trustRdapGone: Boolean(w.expiration) });
        if (oracle.registered === true) {
          await updateWatch(w.id, {
            status: 'held_registered',
            last_status: [],
            last_http: s.code,
            last_checked: nowIso,
            triggered_at: null,
            ...(oracle.expiration ? { expiration: oracle.expiration } : {}),
          });
        } else {
          await updateWatch(w.id, { last_checked: nowIso }); // confirmed gone → stays dropped
        }
        continue;
      }
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
        // across two consecutive checks AND a non-RDAP oracle before declaring it.
        // ('dropped' is handled earlier — auto-heal.)
        if (w.status === 'pending_drop' || w.status === 'held_registered') {
          // 2nd+ consecutive RDAP not-found. Confirm against a non-RDAP oracle
          // before alerting — registries that purge RDAP during pendingDelete
          // (Identity Digital: .computer/.io/…) 404 even on the authoritative
          // server, so RDAP alone cries wolf. A drop is declared ONLY on a
          // positive "available"; anything else HOLDS (fail-safe — a missed/late
          // alert beats a false one, the bug that bit agent.computer).
          // Trust an RDAP-404 as a real drop when RDAP is reliable for this domain
          // (we have an expiration from it — .com/.id/most ccTLDs); require the
          // DomainIQ veto only for RDAP-purged TLDs (no expiration ever seen).
          const oracle = await confirmDropOracle(w.domain, { trustRdapGone: Boolean(w.expiration) });
          if (oracle.expiration) patch.expiration = oracle.expiration;
          if (oracle.registered === false) {
            changed++;
            patch.status = 'dropped';           // confirmed: RDAP 404 + oracle says AVAILABLE
            patch.triggered_at = nowIso;
            kind = 'dropped';
          } else if (oracle.registered === true) {
            // RDAP says gone but WHOIS shows it still registered (pendingDelete on
            // an Identity-Digital-style TLD). Move to a SLOW-polled holding state so
            // we don't hammer the paid oracle every minute — cadence tapers it.
            patch.status = 'held_registered';
          } else {
            patch.status = w.status;            // inconclusive → keep current state, retry next due
          }
        } else {
          patch.status = 'pending_drop';        // first 404 → fast-confirm, no alert yet
        }
      } else {
        // Registered / in-pipeline. If we were mid-confirmation (pending_drop) or
        // holding (held_registered), RDAP found it again → silently return to
        // normal watching (no alert).
        const prevKey = w.last_http === 404 ? 'AVAILABLE' : (w.last_status || []).join('|');
        const newKey = statusKey(s.available, s.statuses);
        const hadBaseline = w.last_status !== null || w.last_http !== null;
        if (w.status === 'pending_drop' || w.status === 'held_registered') {
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
