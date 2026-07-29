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
import { phaseOf, phaseLabel } from './redemption.js';
import { investorSignal } from './investor.js';
import { fullTldDemand } from './demand.js';
import { popularTldCount } from '../evaluate/tldcount.js';
import { techScore } from './techTerms.js';

const DAY = 86_400_000;
// Quality gate applied ONLY to names in the redemption period (Rob): a real,
// in-demand word is registered in ≥ this many of the ~26 most liquid TLDs. Validated:
// dealt 17 · rica 16 · interlaced 12 pass; ferlie 4 · oxeyes 1 don't.
const MIN_TLDS = Number(process.env.EXPIRING_AI_MIN_TLDS || 6);
// .ai IS a tech/AI TLD, so a clearly tech-relevant word doesn't need to prove demand
// across as many extensions — an AI-native name may live on just .ai/.com + a few TLDs.
// So the gate is LOWER for tech words (Rob 2026-07-28): ≥4 instead of ≥6.
const MIN_TLDS_TECH = Number(process.env.EXPIRING_AI_MIN_TLDS_TECH || 4);

// nic.ai (Identity Digital) rate-limits RDAP hard — hammering it just returns a
// wall of failed reads (last_http=null), which is why the redemption count stayed
// stuck: 96% of checks were being throttled, not answered. So the scan is paced:
// low concurrency + a per-call delay + a single-endpoint fast path (skip the
// rdap.org fallback that proxies to the SAME backend). All env-tunable.
const SCAN_CONCURRENCY = Math.max(1, Number(process.env.EXPIRING_AI_SCAN_CONCURRENCY || 2));
const SCAN_DELAY_MS = Math.max(0, Number(process.env.EXPIRING_AI_SCAN_DELAY_MS || 300));
// Per-tick row cap. Paced (workers × ~300ms + RDAP latency ≈ a few names/sec), and
// curate shares the same invocation, so a tick must stay under the 60s function budget.
// ~90 names @ concurrency 2 leaves headroom. The cron fires every 5 min → steady-state
// coverage is limit × 288/day (~26k/day). A tick that times out mid-scan is harmless:
// each name is stamped as it's checked (stalest-first, idempotent), so the rest retry.
// NB concurrency 3 / 130 was tried 2026-07-28 and nic.ai throttled to 100% failure
// after ~10 min — 2 / 90 (~1,080/hr) is the rate that holds. Don't push past it.
const SCAN_LIMIT = Math.max(1, Number(process.env.EXPIRING_AI_SCAN_LIMIT || 90));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
export async function scanDue({ limit = SCAN_LIMIT, concurrency = SCAN_CONCURRENCY } = {}) {
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
      // Registry-only read (single:true) so we don't double-load nic.ai; paced by
      // a per-call delay so the registry keeps answering instead of throttling.
      const s = await rdapStatus(c.domain, { single: true }).catch(() => null);
      checked++;
      if (SCAN_DELAY_MS) await sleep(SCAN_DELAY_MS);
      const nowIso = new Date().toISOString();
      // RDAP flaked (rate-limit / network) → just stamp last_checked so cadence
      // retries it; never treat an unreadable check as a status change.
      if (!s || !s.ok) { await updateCandidate(c.domain, { last_checked: nowIso }); continue; }

      const wasRed = Boolean(c.in_redemption);
      const wasPd = Boolean(c.in_pending_delete);
      const wasSurfaced = wasRed || wasPd;
      const wasAvailable = Boolean(c.available);
      // Where the name sits now: redemption, pending_delete, or neither (registered/
      // restored). Pending delete is the later, more urgent phase (≈4–6 days to drop).
      const phase = s.available ? null : phaseOf(s.statuses);
      const inLifecycle = phase === 'redemption' || phase === 'pending_delete';
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
        // Registrant contact off the SAME RDAP read — public (real mailbox) vs privacy-masked.
        // We already pay for the lookup, so grab it; the report lists a real email/phone.
        registrant_email: s.registrantEmail || null,
        registrant_phone: s.registrantPhone || null,
        registrant_name: s.registrantName || null,
        registrant_private: s.registrantPrivate == null ? null : Boolean(s.registrantPrivate),
      };
      if (s.expiration) patch.expiration = s.expiration;

      // The TLD demand lookup runs ONLY on names in a surfaced window (redemption /
      // pending delete) — never on the whole watchlist (Rob: "cut way down"). We gate
      // ONCE per lapse: the bounded ~26-TLD probe decides quality (≥ MIN_TLDS), remembered
      // in demand_ok, and the full count is stored for display (matches the TLD Count tool).
      // demand_ok carries across the redemption→pending-delete transition so we don't
      // re-probe (or re-decide) as the name advances through the pipeline.
      let demandOk = c.demand_ok;
      if (inLifecycle) {
        if (demandOk == null && c.tld_count == null) {
          const [bounded, full] = await Promise.all([
            popularTldCount(c.sld, { env: process.env }).catch(() => ({ count: 0 })),
            fullTldDemand(c.sld, process.env),
          ]);
          patch.tld_count = full != null ? full : (bounded.count || 0);
          // Tech-relevant words (lexicon match or a priority-2 candidate) clear a LOWER bar.
          const isTech = techScore(c.sld) === 2 || Number(c.priority) >= 2;
          demandOk = (bounded.count || 0) >= (isTech ? MIN_TLDS_TECH : MIN_TLDS);
          patch.demand_ok = demandOk;
        } else if (demandOk == null && c.tld_count != null) {
          // Legacy row (gated before demand_ok existed): infer the pass decision from the
          // prior in_redemption flag so the existing surfaced set is preserved.
          demandOk = wasRed;
          patch.demand_ok = demandOk;
        }
        const nowRed = phase === 'redemption' && !!demandOk;
        const nowPd = phase === 'pending_delete' && !!demandOk;
        patch.in_redemption = nowRed;
        patch.in_pending_delete = nowPd;
        if (nowRed && !wasRed) patch.redemption_since = nowIso;
        if (nowPd && !wasPd) patch.pending_delete_since = nowIso;
      } else {
        patch.in_redemption = false;
        patch.in_pending_delete = false;
        if (s.available) {
          // Terminal drop — stamp dropped_at once and KEEP the lifecycle timestamps
          // (redemption_since/pending_delete_since/tld_count) so the metrics tab can
          // measure how long it sat in each phase.
          if (wasSurfaced && !c.dropped_at) patch.dropped_at = nowIso;
        } else if (wasSurfaced || c.tld_count != null || c.demand_ok != null) {
          // Restored / renewed (out of the pipeline without dropping) — reset the cycle
          // so a FUTURE lapse re-gates and re-tracks from scratch.
          patch.redemption_since = null;
          patch.pending_delete_since = null;
          patch.dropped_at = null;
          patch.tld_count = null;
          patch.demand_ok = null;
        }
      }

      await updateCandidate(c.domain, patch);

      // Alert transitions: freshly surfaced (entered redemption OR pending delete), or a
      // fresh drop. A redemption→pending-delete move is NOT a new entry (already surfaced).
      const nowSurfaced = Boolean(patch.in_redemption) || Boolean(patch.in_pending_delete);
      if (nowSurfaced && !wasSurfaced) {
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
