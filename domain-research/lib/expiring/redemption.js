// Read a domain's RDAP status result and classify where it sits in the expiry
// lifecycle — the signal the Expiring .ai report is built on. "Redemption period"
// is the money window (Sam's ask: Status = redemption period): the owner let it
// lapse and hasn't restored it, so it's about to drop and cheap to grab (a
// restore is deliberately expensive). "Pending delete" is the final 5-day
// countdown → drop.

// The specific EPP status the report keys on.
const REDEMPTION_RE = /redemption/i;
const PENDING_DELETE_RE = /pending\s*delete|pendingdelete/i;
export function isRedemption(statuses) {
  return (statuses || []).some((s) => REDEMPTION_RE.test(String(s)));
}
export function isPendingDelete(statuses) {
  return (statuses || []).some((s) => PENDING_DELETE_RE.test(String(s)));
}
// The report's inclusion test — REDEMPTION PERIOD ONLY (Rob's call, 2026-07-27).
// We deliberately do NOT include pending-delete: that's the final ~5-day window and
// a distinct status; the report is scoped to the redemption period (where the owner
// could still restore). Restore/auto-renew are excluded too (owner reclaiming).
export function inRedemptionWindow(statuses) {
  return isRedemption(statuses);
}

// A one-line phase label for the report/alerts.
export function phaseLabel(s) {
  if (!s || !s.ok) return 'unknown';
  if (s.available) return 'dropped';
  if (isPendingDelete(s.statuses)) return 'pending delete';
  if (isRedemption(s.statuses)) return 'redemption';
  return (s.statuses && s.statuses.length) ? 'registered' : 'registered';
}
