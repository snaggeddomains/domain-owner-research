// Renewal price lookup — "if we acquired this name, what will it cost us to RENEW each
// year?" (the standard/registry cost for a new owner, NOT what the current owner pays with
// their promos). Two Porkbun sources:
//   • pricing/get  — PUBLIC, all TLDs, no key, no rate limit → the standard TLD renewal.
//   • checkDomain  — per-domain; a registry-PREMIUM name carries a distinct (often much
//                    higher) renewal that the standard TLD price misses. Best-effort +
//                    rate-limited, so it only refines the answer when it resolves.
// Fail-open throughout: no data → nulls, never throws.

import { porkbunCheck } from '../variations/availability.js';

const num = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };

// Public Porkbun pricing for EVERY TLD: { tld: {registration, renewal, transfer} }.
// Cached in-module (stable day-to-day); one call covers all lookups.
let _pricing = null;
let _pricingAt = 0;
export async function tldPricing() {
  if (_pricing && Date.now() - _pricingAt < 12 * 3600 * 1000) return _pricing;
  try {
    const res = await fetch('https://api.porkbun.com/api/json/v3/pricing/get', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    });
    const raw = await res.json().catch(() => null);
    if (raw && String(raw.status || '').toUpperCase() === 'SUCCESS' && raw.pricing) {
      _pricing = raw.pricing; _pricingAt = Date.now();
    }
  } catch { /* keep any prior cache */ }
  return _pricing;
}

// → { domain, tld, currency, standard:{registration,renewal,transfer}|null,
//     premium:{is_premium,registration,renewal}|null, renewal (effective), multiple, note }
export async function renewalPrice(domain, env = process.env, { checkPremium = true } = {}) {
  const d = String(domain || '').toLowerCase().trim();
  const tld = d.includes('.') ? d.slice(d.indexOf('.') + 1) : '';
  const pricing = await tldPricing();
  const std = pricing && pricing[tld] ? pricing[tld] : null;
  const standard = std ? { registration: num(std.registration), renewal: num(std.renewal), transfer: num(std.transfer) } : null;

  let premium = null;
  if (checkPremium) {
    try {
      const pk = await porkbunCheck(d, env); // cached (kind 'pkd'); may not resolve for registered names
      if (pk && pk.premium) premium = { is_premium: true, registration: pk.price || null, renewal: pk.renewal || pk.price || null };
    } catch { /* fail-open */ }
  }

  const effective = (premium && premium.renewal) || (standard && standard.renewal) || null;
  const stdRenew = standard && standard.renewal;
  const multiple = premium && premium.renewal && stdRenew ? Math.round((premium.renewal / stdRenew) * 10) / 10 : null;
  const note = !standard ? `No Porkbun pricing for .${tld} — renewal unknown (uncommon TLD or key/network issue).`
    : premium ? `⚠️ Registry-PREMIUM name — renews at ~$${effective}/yr (≈${multiple || '?'}× the standard .${tld} of $${stdRenew}). A high recurring holding cost.`
    : `Standard .${tld} renewal ≈ $${stdRenew}/yr (registry-premium not detected).`;

  return { domain: d, tld, currency: 'USD', standard, premium, renewal: effective, multiple, note };
}

export default { renewalPrice, tldPricing };
