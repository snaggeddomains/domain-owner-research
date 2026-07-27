// Full TLD demand count for a word — the SAME number the standalone TLD Count tool
// shows (registered across all ~1,590 IANA TLDs, e.g. abacus = 248), so the report's
// "Demand" column is consistent with that tool. It's expensive (a full DNS sweep), so
// we only ever compute it for the handful of names that actually reach redemption —
// NOT for the whole watchlist (which is gated cheaply by the bounded popular-TLD probe
// in candidates.js). Cache-first (kind 'tc'), fail-open to null.
import { countRegistrations } from '../evaluate/tldcount.js';

export async function fullTldDemand(sld, env = process.env) {
  try {
    const r = await countRegistrations(sld, { env });
    return r && Number.isFinite(r.count) ? r.count : null;
  } catch {
    return null;
  }
}
