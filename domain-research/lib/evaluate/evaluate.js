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
    new Promise((resolve) => setTimeout(() => resolve(EMPTY_BUYERS), 22000)),
  ]);
  const [signals, buyers] = await Promise.all([
    gatherSignals(domain, env),
    cappedBuyers,
  ]);

  const valuation = computeValuation({
    quality: signals.quality,
    namebio: signals.comps.namebio,
    internal: signals.comps.internal,
    dealOffers: signals.comps.deal_history && signals.comps.deal_history.offers,
    appraise: signals.appraisals.appraise,
    atom: signals.appraisals.atom,
    listing: signals.listing,
    price: priceNum,
  });

  const verdict = await synthesizeVerdict({ signals, buyers, valuation, price: priceNum, env });

  // Apply the LLM's bounded adjustment to the surfaced valuation so the UI shows
  // the FINAL numbers (the raw model stays under valuation.model_* for audit).
  const finalValuation = verdict.adjusted_valuation
    ? {
        ...valuation,
        fair_value: verdict.adjusted_valuation.fair_value,
        bands: verdict.adjusted_valuation.bands,
        recommended_max_bid: verdict.adjusted_valuation.recommended_max_bid,
        price_band: verdict.adjusted_valuation.price_band,
        model_fair_value: valuation.fair_value, // pre-adjustment, for audit
        adjusted: true,
        adjust: verdict.adjust,
      }
    : { ...valuation, adjusted: false, adjust: 1 };

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
