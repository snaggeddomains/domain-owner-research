// Adaptive Beeper polling cadence.
//
// The cron fires every minute, but a watch is only actually hit when it's DUE.
// A name on the cusp of dropping (in the delete pipeline, or hours from expiry)
// is polled every minute so we never miss the drop; a name whose expiration is
// months out is polled occasionally — tightening as the date approaches:
//   far out → weekly · ~2wk → daily · ~1wk → 2×/day · 2d → 6h · day-of → hourly
//   → then the registry's delete pipeline (redemption/pending-delete) → minute.
// This keeps RDAP load (and rate-limit risk) proportional to how imminent a
// drop actually is.

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

// Final-countdown EPP state → poll EVERY MINUTE (the drop can land any second).
const PENDING_DELETE = /pending\s*delete/i;
// Expired-but-recoverable pipeline (redemption / restore / auto-renew) — the name
// has left clean-registered and is heading toward a possible drop → poll often.
const IN_PIPELINE = /(redemption|pending\s*restore|auto.?renew|renew\s*period)/i;

// Days until the stored expiration (negative once past); null when unknown.
export function daysToExpiry(expiration, now = Date.now()) {
  if (!expiration) return null;
  const t = Date.parse(expiration);
  if (Number.isNaN(t)) return null;
  return (t - now) / DAY;
}

// Desired gap between checks for this watch, in ms — purely a function of the
// watch's known expiration + current EPP statuses (so it re-evaluates every tick
// as the date nears or the status moves into the delete pipeline).
export function checkIntervalMs(watch, now = Date.now()) {
  const statuses = Array.isArray(watch && watch.last_status) ? watch.last_status : [];
  // Pipeline statuses override the date — a drop is imminent regardless of when
  // the original expiration was.
  if (statuses.some((s) => PENDING_DELETE.test(String(s)))) return MIN;
  if (statuses.some((s) => IN_PIPELINE.test(String(s)))) return HOUR;

  const d = daysToExpiry(watch && watch.expiration, now);
  if (d === null) return HOUR;       // unknown expiry → check hourly to LEARN the
                                     // date (then it tapers); also the floor for
                                     // TLDs whose RDAP never exposes expiration
  if (d > 14) return 7 * DAY;        // far out → weekly (also refreshes the date)
  if (d > 7) return DAY;             // ~2 weeks → daily
  if (d > 2) return 12 * HOUR;       // ~1 week → twice a day
  if (d > 1) return 6 * HOUR;        // 2 days out
  if (d > 0) return HOUR;            // day-of → hourly
  return 6 * HOUR;                   // past expiry but still clean → wait for the pipeline
}

// Is this watch due for a check right now? (cron decides whether to hit RDAP.)
export function isDue(watch, now = Date.now()) {
  if (!watch || !watch.last_checked) return true;     // never checked → check now
  const last = Date.parse(watch.last_checked);
  if (Number.isNaN(last)) return true;
  // Half-a-minute slack so an interval that's a multiple of the 1-min tick isn't
  // pushed a whole tick late by sub-second timing.
  return now - last >= checkIntervalMs(watch, now) - MIN / 2;
}

// UI bucket for grouping the watchlist.
//   'live'      → polled every minute (delete pipeline / imminent)
//   'hourly'    → expired-pipeline or day-of (checked ~hourly)
//   'scheduled' → long-term, tapered by the expiration date
export function cadenceTier(watch, now = Date.now()) {
  const ms = checkIntervalMs(watch, now);
  if (ms <= MIN) return 'live';
  if (ms <= HOUR) return 'hourly';
  return 'scheduled';
}

// A short human label for the current cadence (for the UI).
export function cadenceLabel(watch, now = Date.now()) {
  const ms = checkIntervalMs(watch, now);
  if (ms <= MIN) return 'every minute';
  if (ms <= HOUR) return 'hourly';
  if (ms <= 6 * HOUR) return 'every 6h';
  if (ms <= 12 * HOUR) return 'every 12h';
  if (ms <= DAY) return 'daily';
  return 'weekly';
}

// Everything the UI needs, computed once server-side and attached to a watch row.
export function cadenceInfo(watch, now = Date.now()) {
  const intervalMs = checkIntervalMs(watch, now);
  const d = daysToExpiry(watch && watch.expiration, now);
  const last = watch && watch.last_checked ? Date.parse(watch.last_checked) : null;
  return {
    tier: cadenceTier(watch, now),
    label: cadenceLabel(watch, now),
    interval_ms: intervalMs,
    days_to_expiry: d === null ? null : Math.round(d * 10) / 10,
    next_check: last && !Number.isNaN(last) ? new Date(last + intervalMs).toISOString() : null,
  };
}
