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
import { investorSignal } from './investor.js';
import { fullTldDemand } from './demand.js';
import { popularTldCount } from '../evaluate/tldcount.js';

const DAY = 86_400_000;
// Quality gate applied ONLY to names in the redemption period (Rob): a real,
// in-demand word is registered in ≥ this many of the ~26 most liquid TLDs. Validated:
// dealt 17 · rica 16 · interlaced 12 pass; ferlie 4 · oxeyes 1 don't.
const MIN_TLDS = Number(process.env.EXPIRING_AI_MIN_TLDS || 6);

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
export async function scanDue({ limit = 500, concurrency = 4 } = {}) {
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
      const isRed = !s.available && inRedemptionWindow(s.statuses);
      // "Likely investor" = the live nameservers are a marketplace/for-sale host
      // (Afternic/Sedo/Dan/…). Narrow by design — registrar-default DNS is NOT flagged.
      const ns = Array.isArray(s.nameservers) ? s.nameservers : [];
      const parked = investorSignal(ns).investor;

      const patch = {
        last_status: s.available ? [] : s.statuses,
        last_http: s.code,
        last_checked: nowIso,
        available: Boolean(s.available),
        nameservers: ns,
        registrar: s.registrar || null,
        parked,
      };
      if (s.expiration) patch.expiration = s.expiration;

      // The TLD lookup runs ONLY here — on names actually in the redemption period —
      // never on the whole watchlist (Rob: "cut way down"). On the FIRST redemption
      // sighting we run the demand check once: the bounded ~26-TLD probe decides quality
      // (≥ MIN_TLDS), and the full count is stored for display (matches the TLD Count
      // tool). The result is cached in tld_count so re-sightings don't re-probe.
      let nowInWindow = false;
      if (isRed) {
        if (c.tld_count != null) {
          nowInWindow = wasInWindow;                 // already demand-checked → keep the decision
        } else {
          const [bounded, full] = await Promise.all([
            popularTldCount(c.sld, { env: process.env }).catch(() => ({ count: 0 })),
            fullTldDemand(c.sld, process.env),
          ]);
          patch.tld_count = full != null ? full : (bounded.count || 0);
          nowInWindow = (bounded.count || 0) >= MIN_TLDS;   // surface only in-demand names
        }
      } else if (c.tld_count != null) {
        patch.tld_count = null;                      // left redemption → reset so a re-entry re-checks
      }
      patch.in_redemption = nowInWindow;
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
