// SNAP Eval orchestrator — the single entry point the API calls. Gathers every
// signal + the buyer/competition read (in parallel), runs the deterministic
// valuation + price-band model, then the LLM verdict synthesis, and assembles the
// full report object the UI renders and the cache stores.
//
//   evaluateDomain({ domain, price?, env }) → {
//     domain, price, generated_at,
//     verdict,      // headline + rationale + reasons + band (the answer)
//     valuation,    // fair resale value + 5 price bands + anchors (the numbers)
//     signals,      // quality, current use, for-sale, appraisals, comps, web, …
//     buyers,       // angles + who's using the term + fundable buyer count
//   }
//
// "One pass" (the chosen cost posture): every run gathers paid comps/appraisals/
// firmographics, but the API caches per (domain) so a re-view never re-spends.

import { gatherSignals } from './signals.js';
import { findBuyers } from './buyers.js';
import { computeValuation } from './score.js';
import { synthesizeVerdict } from './verdict.js';

export async function evaluateDomain({ domain, price = null, env = process.env } = {}) {
  const priceNum = Number(price) > 0 ? Number(price) : null;

  // Signals + buyers are independent — run them together.
  // Buyers (angle LLM + firmographics + variant liveness) is the slowest branch.
  // Hard-cap it so it can't push the whole eval past the function's 60s budget —
  // a cold run that overruns degrades to an empty buyer pool rather than a 504.
  const EMPTY_BUYERS = { angles: [], active_users: [], for_sale_siblings: [], fundable_buyer_count: 0 };
  const cappedBuyers = Promise.race([
    findBuyers(domain, env).catch(() => EMPTY_BUYERS),
    new Promise((resolve) => setTimeout(() => resolve(EMPTY_BUYERS), 16000)),
  ]);
  const [signals, buyers] = await Promise.all([
    gatherSignals(domain, env),
    cappedBuyers,
  ]);

  // Is the name in active commercial use (live, non-parked site)? A live premium
  // name is real demand evidence — and it tells the model an OLD cheap exact-domain
  // sale predates the current asset (stale), so don't let it drag the value.
  const cu = signals.current_use || {};
  const activeUse = Boolean(cu.reachable && !(cu.parking && cu.parking.likely_parked));

  // The valuation is fully DETERMINISTIC (comps + quality + rules) — no LLM nudge.
  // The LLM only writes the narrative; it never moves the price.
  const valuation = computeValuation({
    quality: signals.quality,
    namebio: signals.comps.namebio,
    namebioComps: signals.comps.namebio_comps,
    tracker: signals.comps.tracker,
    dealOffers: signals.comps.deal_history && signals.comps.deal_history.offers,
    appraise: signals.appraisals.appraise,
    atom: signals.appraisals.atom,
    trademark: signals.trademark,
    listing: signals.listing,
    activeUse,
    price: priceNum,
  });

  const verdict = await synthesizeVerdict({ signals, buyers, valuation, price: priceNum, env });

  const finalValuation = { ...valuation, adjusted: false, adjust: 1 };

  return {
    domain: signals.domain,
    price: priceNum,
    generated_at: new Date().toISOString(),
    verdict,
    valuation: finalValuation,
    signals,
    buyers,
  };
}

export default { evaluateDomain };
