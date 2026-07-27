// Scan the Expiring .ai watchlist adaptively. Beeper's cadence does the heavy
// lifting: a candidate whose expiration is months out is only re-checked
// occasionally (just to LEARN/refresh the date), while one that's near expiry —
// or already in the redemption/pending-delete window — is polled frequently so we
// catch the redemption drop. This is exactly Rob's note: we know each name's
// expiration, so we don't re-scan the whole high-quality set for redemption, only
// the ones getting close.
//
// Returns the newly-entered-redemption names so the cron can alert on them.
import { rdapStatus } from '../beeper/rdap.js';
import { isDue } from '../beeper/cadence.js';
import { staleCandidates, updateCandidate } from '../db/expiringAi.js';
import { inRedemptionWindow, phaseLabel } from './redemption.js';
import { looksParked } from './candidates.js';

// One scan pass over the due slice. concurrency workers; bounded by `limit` rows
// pulled (stalest first). Fail-open per name.
export async function scanDue({ limit = 300, concurrency = 4 } = {}) {
  const now = Date.now();
  const batch = await staleCandidates(limit);
  const due = batch.filter((c) => isDue(c, now));
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

      const patch = {
        last_status: s.available ? [] : s.statuses,
        last_http: s.code,
        last_checked: nowIso,
        available: Boolean(s.available),
        in_redemption: nowInWindow,
      };
      if (s.expiration) patch.expiration = s.expiration;
      // Stamp when it first enters the window; clear if it leaves (restored/renewed).
      if (nowInWindow && !wasInWindow) patch.redemption_since = nowIso;
      if (!nowInWindow && wasInWindow) patch.redemption_since = null;

      await updateCandidate(c.domain, patch);

      // Alert transitions: freshly in redemption (and NOT investor-parked), or a drop.
      if (nowInWindow && !wasInWindow && !looksParked(c.nameservers)) {
        entered.push({ domain: c.domain, sld: c.sld, phase: phaseLabel(s), expiration: s.expiration || c.expiration || null });
      }
      if (s.available && !wasAvailable && !looksParked(c.nameservers)) {
        dropped.push({ domain: c.domain, sld: c.sld });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, due.length) || 1 }, worker));
  return { batch: batch.length, due: due.length, checked, entered, dropped };
}
