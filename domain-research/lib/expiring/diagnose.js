// Fail-safe self-diagnosis for the Expiring .ai redemption pipeline.
//
// The redemption pipeline has stalled twice before in subtle ways (a frozen
// `last_checked` clog, a due-slice ordering bug) that were only caught by hand,
// days later, via read-only SQL. This module runs that same triage automatically:
// if no name has been flagged as entering the redemption window in the last 24h,
// the cron calls diagnoseRedemptionStall() to figure out WHY (is the scan even
// running? is it all being throttled? is the registered pool starving?) and
// alerts with a plain-language read + likely cause, so a stall surfaces in hours
// instead of days.
import { getDb, isDbConfigured } from '../db/supabase.js';

const T = 'domain_research_expiring_ai';
const DAY = 86_400_000;

// One count query, fail-open to 0 (missing column / error → 0 so a partial
// migration never throws the whole diagnosis).
async function count(build) {
  try {
    const r = await build(getDb().from(T).select('domain', { count: 'exact', head: true }));
    return r.error ? null : (r.count || 0);
  } catch { return null; }
}

// Newest value of a timestamp column (returns ms epoch or null).
async function newest(col, filter) {
  try {
    let q = getDb().from(T).select(col).not(col, 'is', null).order(col, { ascending: false }).limit(1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error || !data || !data.length) return null;
    const v = Date.parse(data[0][col]);
    return Number.isNaN(v) ? null : v;
  } catch { return null; }
}

// Gather the health signals and decide the likely cause. Pure read — never writes.
// Returns { ok, stalled, hoursSinceRedemption, signals, cause, summary }.
export async function diagnoseRedemptionStall({ thresholdHours = 24 } = {}) {
  if (!isDbConfigured()) return { ok: false, stalled: false, summary: 'DB not configured.' };
  const now = Date.now();

  const [
    lastRedemptionMs, lastScanMs,
    inRedemption, inPending,
    checked24h, redEntered7d, dropped7d, droppedSkipped7d,
    registered, available, nearExpiryDue, pastExpiry,
  ] = await Promise.all([
    newest('redemption_since'),
    newest('last_checked'),
    count((q) => q.eq('in_redemption', true)),
    count((q) => q.eq('in_pending_delete', true)),
    count((q) => q.gte('last_checked', new Date(now - DAY).toISOString())),
    count((q) => q.gte('redemption_since', new Date(now - 7 * DAY).toISOString())),
    count((q) => q.gte('dropped_at', new Date(now - 7 * DAY).toISOString())),
    // Drops in the last 7d that were NEVER flagged in redemption (redemption_since null)
    // — the tell that we're skipping the window entirely.
    count((q) => q.gte('dropped_at', new Date(now - 7 * DAY).toISOString()).is('redemption_since', null)),
    count((q) => q.not('available', 'is', true)),
    count((q) => q.eq('available', true)),
    // Registered, not surfaced, expiry within 90d (or unknown) = the source pool for
    // new redemptions; how many are DUE-stale (last_checked older than a day).
    count((q) => q.not('available', 'is', true).lt('last_checked', new Date(now - DAY).toISOString())),
    // Past their stored expiration but not yet surfaced — the imminent pipeline.
    count((q) => q.not('available', 'is', true).lt('expiration', new Date(now).toISOString()).is('in_redemption', null)),
  ]);

  const hoursSinceRedemption = lastRedemptionMs == null ? null : Math.round((now - lastRedemptionMs) / 3_600_000);
  const minsSinceScan = lastScanMs == null ? null : Math.round((now - lastScanMs) / 60_000);
  const stalled = hoursSinceRedemption == null ? false : hoursSinceRedemption >= thresholdHours;

  // Decide the most likely cause, cheapest-signal-first.
  let cause;
  if (checked24h != null && checked24h < 50) {
    cause = minsSinceScan != null && minsSinceScan > 30
      ? 'The scan cron is NOT running (no writes in ' + minsSinceScan + ' min). Check the vercel.json */5 cron + CRON_SECRET.'
      : 'The scan is barely writing (<50 rows/24h) — likely nic.ai RDAP throttling almost every read. Check EXPIRING_AI_SCAN_CONCURRENCY/LIMIT (2/90 is the ceiling).';
  } else if (dropped7d && droppedSkipped7d != null && dropped7d > 0 && droppedSkipped7d / dropped7d > 0.5) {
    cause = 'Names are DROPPING without ever being flagged in redemption (' + droppedSkipped7d + '/' + dropped7d + ' in 7d). The registered pool is being re-scanned too slowly to catch the ~30d redemption window — confirm registered-only scan is on (EXPIRING_AI_SCAN_AVAILABLE unset).';
  } else if (nearExpiryDue != null && nearExpiryDue > 2000) {
    cause = 'A large due-stale registered backlog (' + nearExpiryDue + ') isn\'t being reached — the scan may be clogged on the available pool or a due-slice ordering bug. Check scanDue slice priority.';
  } else if (redEntered7d === 0) {
    cause = 'No names entered redemption in 7d and the scan looks healthy — likely genuine low supply + the ≥6-popular-TLD demand gate rejecting low-demand words. May be normal; watch another cycle.';
  } else {
    cause = 'Scan is writing and some names entered redemption recently; the 24h gap may be normal supply variance. Watch the next cycle.';
  }

  const signals = {
    hoursSinceRedemption, minsSinceScan,
    inRedemption, inPending,
    checked24h, redEntered7d, dropped7d, droppedSkipped7d,
    registered, available, nearExpiryDue, pastExpiry,
  };

  const summary =
    'Expiring .ai: last redemption ' + (hoursSinceRedemption == null ? 'never' : hoursSinceRedemption + 'h ago') +
    ' · scan wrote ' + (minsSinceScan == null ? 'never' : minsSinceScan + ' min ago') +
    ' · checked ' + (checked24h == null ? '?' : checked24h) + '/24h' +
    ' · in redemption ' + (inRedemption == null ? '?' : inRedemption) +
    ' · drops(7d) ' + (dropped7d == null ? '?' : dropped7d) + ' (' + (droppedSkipped7d == null ? '?' : droppedSkipped7d) + ' unflagged)' +
    ' · due-stale registered ' + (nearExpiryDue == null ? '?' : nearExpiryDue) +
    '. Likely cause: ' + cause;

  return { ok: true, stalled, hoursSinceRedemption, signals, cause, summary };
}
