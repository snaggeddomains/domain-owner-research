// Scan the Expiring .ai watchlist adaptively. Beeper's cadence does the heavy
// lifting: a candidate whose expiration is months out is only re-checked
// occasionally (just to LEARN/refresh the date), while one that's near expiry —
// or already in the redemption/pending-delete window — is polled frequently so we
// catch the redemption drop. This is exactly Rob's note: we know each name's
// expiration, so we don't re-scan the whole high-quality set for redemption, only
// the ones getting close.
//
// Candidates come from the dictionary (see candidates.js), so many are either
// unregistered (RDAP 404) or plain registered-and-renewing; the scan reads each
// one's real RDAP status + nameservers, flags parked (investor) names, and
// captures the expiration so the cadence can taper. Returns the newly-entered-
// redemption names so the cron can alert on them.
import { rdapStatus } from '../beeper/rdap.js';
import { isDue } from '../beeper/cadence.js';
import { staleCandidates, updateCandidate } from '../db/expiringAi.js';
import { inRedemptionWindow, phaseLabel } from './redemption.js';
import { looksParked } from './candidates.js';

const DAY = 86_400_000;

// When is a candidate due? Unregistered (available) dictionary .ai names are the
// bulk of the set and almost never change — re-check them weekly, not hourly (the
// cadence default for an unknown-expiry name), so we don't hammer the .ai RDAP
// endpoint on tens of thousands of empty words. Everything else uses Beeper's
// adaptive cadence (near-expiry / in-pipeline → frequent).
function dueForCandidate(c, now) {
  if (c.available) {
    if (!c.last_checked) return true;
    const last = Date.parse(c.last_checked);
    return Number.isNaN(last) || now - last >= 7 * DAY;
  }
  return isDue(c, now);
}

// One scan pass over the due slice. concurrency workers; bounded by `limit` rows
// pulled (stalest first). Fail-open per name.
export async function scanDue({ limit = 400, concurrency = 3 } = {}) {
  const now = Date.now();
  const batch = await staleCandidates(limit);
  const due = batch.filter((c) => dueForCandidate(c, now));
  const queue = [...due];
  const entered = [];   // names that JUST entered redemption/pending-delete this pass
  const dropped = [];   // names that JUST went available
  let checked = 0;

  async function worker() {
    while (queue.length) {
      const c = queue.shift();
      const s = await rdapStatus(c.domain).catch(() => null);
      checked++;
      const nowIso = new Date().toISOString();
      // RDAP flaked (rate-limit / network) → just stamp last_checked so cadence
      // retries it; never treat an unreadable check as a status change.
      if (!s || !s.ok) { await updateCandidate(c.domain, { last_checked: nowIso }); continue; }

      const wasInWindow = Boolean(c.in_redemption);
      const wasAvailable = Boolean(c.available);
      const nowInWindow = !s.available && inRedemptionWindow(s.statuses);
      // Parked (investor) read from the live nameservers when present; a name deep
      // in redemption often has NS stripped → treat as not-parked (it's dropping).
      const ns = Array.isArray(s.nameservers) ? s.nameservers : [];
      const parked = ns.length ? looksParked(ns) : false;

      const patch = {
        last_status: s.available ? [] : s.statuses,
        last_http: s.code,
        last_checked: nowIso,
        available: Boolean(s.available),
        in_redemption: nowInWindow,
        nameservers: ns,
        parked,
      };
      if (s.expiration) patch.expiration = s.expiration;
      // Stamp when it first enters the window; clear if it leaves (restored/renewed).
      if (nowInWindow && !wasInWindow) patch.redemption_since = nowIso;
      if (!nowInWindow && wasInWindow) patch.redemption_since = null;

      await updateCandidate(c.domain, patch);

      // Alert transitions: freshly in redemption, or a fresh drop. (We surface all —
      // a lapsing name is being abandoned regardless of the NS it sits on.)
      if (nowInWindow && !wasInWindow) {
        entered.push({ domain: c.domain, sld: c.sld, phase: phaseLabel(s), expiration: s.expiration || c.expiration || null });
      }
      if (s.available && !wasAvailable) {
        dropped.push({ domain: c.domain, sld: c.sld });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, due.length) || 1 }, worker));
  return { batch: batch.length, due: due.length, checked, entered, dropped };
}
