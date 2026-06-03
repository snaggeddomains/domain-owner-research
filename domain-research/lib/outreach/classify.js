// Indicator → template MAPPING TABLE. Instead of a rigid first-match, each
// built-in scenario has a set of weighted indicators; we score every scenario
// against the report's indicators and return a ranked list with the reasons that
// fired. This makes selection deliberate and inspectable (and tunable — adjust a
// weight here rather than reordering if/else branches). The top-scoring scenario
// is the deterministic prior; the drafter LLM gets the full ranking and may
// confirm it, pick another, propose a new template, or go bespoke.
//
// Each rule: [indicatorKey, weight, reasonText]. indicatorKey is a boolean field
// on the signals object (see signals.js). Weight is added to the scenario's score
// when the indicator is true.

import { SCENARIO_BY_ID } from './templates.js';

export const MAPPING = {
  listed_for_sale: [
    ['listed', 5, 'Listed for sale on a marketplace'],
    ['domainInvestor', 4, 'Owner reads as a domain investor'],
    ['hasPlatform', 2, 'A specific marketplace/platform was identified'],
  ],
  privacy_proxy: [
    ['noOwner', 5, 'No owner could be established'],
    ['privacy', 4, 'WHOIS is privacy / proxy-protected'],
    ['noContact', 2, 'No reachable named contact'],
  ],
  corporate_redirect: [
    ['isCompany', 2, 'Corporate owner'],
    ['redirectsToParent', 4, 'Redirects to a parent / acquirer site'],
    ['acquisition', 3, 'Looks acquired / inherited through a transaction'],
    ['multiStakeholder', 1, 'Multiple stakeholders to address'],
  ],
  continuity_large: [
    ['isCompany', 1, 'Corporate owner'],
    ['siteActive', 2, 'Site and email are actively in use'],
    ['largeCompanyHint', 4, 'Reads as a larger company — continuity will matter'],
  ],
  active_small: [
    ['siteActive', 4, 'Site and email appear actively in use'],
    ['isCompany', 1, 'Operating company'],
    ['isIndividual', 1, 'Individual operator'],
    ['smallOperator', 1, 'Smaller operating footprint'],
  ],
  research_informed: [
    ['mayStillOwn', 3, 'Former/associated owner who may still hold it'],
    ['priorCompanyTie', 3, 'Traces back to a prior company / project'],
    ['mediumConfidence', 2, 'Ownership is likely but not fully certain'],
    ['namedOwner', 1, 'A specific likely owner to address'],
  ],
  passive_individual: [
    ['isIndividual', 3, 'Named individual owner'],
    ['parked', 2, 'Domain is parked / not actively in use'],
    ['highConfidence', 1, 'Owner identified with high confidence'],
    ['quietDefault', 1, 'No active-use or for-sale signals'],
  ],
};

// Derive the boolean indicator map the table reads from the raw signals.
export function indicatorsFor(sig) {
  return {
    listed: Boolean(sig.listed),
    domainInvestor: sig.ownerType === 'domain_investor' || sig.ownerType === 'marketplace_only',
    hasPlatform: Boolean(sig.platform),
    noOwner: !sig.likelyOwner || sig.ownerType === 'unknown',
    privacy: Boolean(sig.privacy),
    noContact: !sig.hasPrimaryContact,
    isCompany: Boolean(sig.isCompany),
    isIndividual: Boolean(sig.isIndividual),
    redirectsToParent: Boolean(sig.redirectsToParent),
    acquisition: Boolean(sig.acquisition),
    multiStakeholder: Boolean(sig.multiStakeholder),
    siteActive: Boolean(sig.siteActive),
    largeCompanyHint: Boolean(sig.largeCompanyHint),
    smallOperator: Boolean(sig.siteActive) && !sig.largeCompanyHint,
    mayStillOwn: Boolean(sig.mayStillOwn),
    priorCompanyTie: Boolean(sig.priorCompanyTie),
    mediumConfidence: sig.confidenceBand === 'Medium' || sig.confidenceBand === 'Low',
    highConfidence: sig.confidenceBand === 'High',
    namedOwner: Boolean(sig.namedOwner),
    parked: Boolean(sig.parked),
    quietDefault: !sig.listed && !sig.siteActive && !sig.redirectsToParent,
  };
}

// Rank every scenario by score. Returns [{ id, name, score, reasons }] desc.
export function rankScenarios(sig) {
  const ind = indicatorsFor(sig);
  const ranked = Object.entries(MAPPING).map(([id, rules]) => {
    let score = 0;
    const reasons = [];
    for (const [key, weight, text] of rules) {
      if (ind[key]) {
        score += weight;
        reasons.push(text);
      }
    }
    return { id, name: SCENARIO_BY_ID[id]?.name || id, score, reasons };
  });
  ranked.sort((a, b) => b.score - a.score);
  // Passive-individual is the catch-all default if nothing scored.
  if (ranked.every((r) => r.score === 0)) {
    const def = ranked.find((r) => r.id === 'passive_individual');
    if (def) { def.score = 1; def.reasons = ['Default — straightforward direct ask']; def && ranked.sort((a, b) => b.score - a.score); }
  }
  return ranked;
}

// Back-compat: the single best pick with its reasons.
export function classifyScenario(sig) {
  const ranked = rankScenarios(sig);
  const top = ranked[0];
  return { id: top.id, name: top.name, reasons: top.reasons.length ? top.reasons : ['Closest available template'] };
}
