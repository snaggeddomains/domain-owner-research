// Deterministic scenario classifier. Priority-ordered (most transactional /
// most specific first); first match wins. Returns the chosen scenario id plus
// the human-readable reasons that fired, so the UI can show "why this template".
// The 6-vs-7 (small vs large active company) split is genuinely hard to call
// from signals, so we default to active_small and let the user switch to
// continuity_large in the dropdown unless there's an explicit large-company hint.

import { SCENARIO_BY_ID } from './templates.js';

export function classifyScenario(sig) {
  const reasons = [];
  const pick = (id, why) => {
    reasons.push(...(Array.isArray(why) ? why : [why]));
    return { id, name: SCENARIO_BY_ID[id]?.name || id, reasons };
  };

  // 4 — listed for sale / investor
  if (sig.listed || sig.ownerType === 'domain_investor' || sig.ownerType === 'marketplace_only') {
    const why = [];
    if (sig.platform) why.push(`Listed for sale on ${sig.platform}`);
    else if (sig.listed) why.push('Domain appears listed for sale');
    if (sig.ownerType === 'domain_investor') why.push('Owner reads as a domain investor');
    if (sig.ownerType === 'marketplace_only') why.push('Only a marketplace listing was found');
    return pick('listed_for_sale', why.length ? why : ['For-sale / investor signals']);
  }

  // 3 — privacy / proxy / unknown owner
  if (!sig.likelyOwner || sig.ownerType === 'unknown' || (sig.privacy && !sig.hasPrimaryContact)) {
    const why = [];
    if (!sig.likelyOwner || sig.ownerType === 'unknown') why.push('No owner could be established');
    if (sig.privacy) why.push('WHOIS is privacy/proxy-protected');
    if (!sig.hasPrimaryContact) why.push('No reachable named contact');
    return pick('privacy_proxy', why);
  }

  // 5 — corporate owner, redirect to parent / acquirer
  if (sig.ownerType === 'active_company' && (sig.redirectsToParent || sig.acquisition)) {
    const why = [];
    if (sig.redirectsToParent) why.push(`Redirects to a parent site${sig.parentHost ? ` (${sig.parentHost})` : ''}`);
    if (sig.acquisition) why.push('Looks acquired / inherited through a transaction');
    why.push('Corporate owner — may need routing to the right stakeholder');
    return pick('corporate_redirect', why);
  }

  // 7 — active, larger company (continuity)
  if (sig.ownerType === 'active_company' && sig.siteActive && sig.largeCompanyHint) {
    return pick('continuity_large', ['Active site for a larger company', 'Continuity is likely the first objection']);
  }

  // 6 — active small operator / startup
  if ((sig.ownerType === 'active_company' || sig.ownerType === 'individual') && sig.siteActive) {
    return pick('active_small', ['Site and email appear actively in use', 'Smaller operating company / startup']);
  }

  // 2 — research-informed, likely-but-unconfirmed owner with a breadcrumb
  if ((sig.confidence === 'Medium' || sig.confidence === 'Low') && (sig.clusterTie || sig.acquisition)) {
    const why = ['Ownership is likely but not fully certain'];
    if (sig.clusterTie) why.push('Tied via a shared-registrant sibling domain');
    if (sig.acquisition) why.push('Traces back to a prior company / transaction');
    return pick('research_informed', why);
  }

  // 1 — passive individual, not actively in use (default)
  const why = [];
  if (sig.ownerType === 'individual' || sig.ownerType === 'former_operator') why.push('Named individual owner');
  if (sig.parked) why.push('Domain is parked / not actively in use');
  why.push('Straightforward direct ask');
  return pick('passive_individual', why);
}
