// Read a domain's RDAP status result and classify where it sits in the expiry
// lifecycle — the signal the Expiring .ai report is built on. "Redemption period"
// is the money window (Sam's ask: Status = redemption period): the owner let it
// lapse and hasn't restored it, so it's about to drop and cheap to grab (a
// restore is deliberately expensive). "Pending delete" is the final 5-day
// countdown → drop.

// The specific EPP status the report keys on.
const REDEMPTION_RE = /redemption/i;
const PENDING_DELETE_RE = /pending\s*delete|pendingdelete/i;
// The "heading toward a drop" set = redemption OR pending-delete ONLY. Deliberately
// NARROWER than Beeper's lifecycle: pending-RESTORE / auto-renew mean the owner is
// RECLAIMING the name (going the other way), so they are NOT the drop signal here.
const PIPELINE_RE = /(redemption|pending\s*delete|pendingdelete)/i;

export function isRedemption(statuses) {
  return (statuses || []).some((s) => REDEMPTION_RE.test(String(s)));
}
export function isPendingDelete(statuses) {
  return (statuses || []).some((s) => PENDING_DELETE_RE.test(String(s)));
}
// In the redemption/pending-delete window (the report's inclusion test). Restore/
// auto-renew are NOT the drop signal — a name being restored is going the OTHER
// way — so, unlike Beeper's broad lifecycle, we don't count them here.
export function inRedemptionWindow(statuses) {
  return (statuses || []).some((s) => PIPELINE_RE.test(String(s)));
}

// A one-line phase label for the report/alerts.
export function phaseLabel(s) {
  if (!s || !s.ok) return 'unknown';
  if (s.available) return 'dropped';
  if (isPendingDelete(s.statuses)) return 'pending delete';
  if (isRedemption(s.statuses)) return 'redemption';
  return (s.statuses && s.statuses.length) ? 'registered' : 'registered';
}
