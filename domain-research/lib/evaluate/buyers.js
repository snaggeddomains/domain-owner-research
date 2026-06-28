// Potential-buyer + competitor read for the purchase evaluator. Reuses the Sales
// Research primitives standalone (no Inngest pipeline):
//   • anglesForSeed   — LLM enumerates the BUYER ANGLES (industries/products whose
//                       companies would want this name) + notable players, and
//                       (verify) grounds each headliner with real firmographics /
//                       ability-to-pay. This is "who would buy it, and can they pay".
//   • discoverUpgrade — enumerates the same SLD across other extensions + affixed
//                       brand variants and classifies each (active / for_sale /
//                       inactive). The ACTIVE ones are "who's already using this
//                       term" — direct competitors / exact-match end users, the
//                       highest-intent buyers AND a read on how contested the term is.
//
// Both are free-to-cheap and fail-open. A resale buy is only as good as its exit,
// so a fat, fundable buyer pool is a core part of the verdict.

import { anglesForSeed } from '../sales/discovery/angles.js';
import { discoverUpgrade } from '../sales/discovery/upgrade.js';

export async function findBuyers(domain, env = process.env, { verify = true } = {}) {
  const [angles, variants] = await Promise.all([
    env.ANTHROPIC_API_KEY ? anglesForSeed(domain, env, { verify }).catch(() => []) : Promise.resolve([]),
    discoverUpgrade(domain, { classifyStatus: true }).catch(() => []),
  ]);

  // Who is already USING the term (live sites on a sibling extension / affixed
  // brand). These are competition + the most likely end-user buyers.
  const activeUsers = (Array.isArray(variants) ? variants : [])
    .filter((v) => v && v.status === 'active')
    .slice(0, 20)
    .map((v) => ({ domain: v.domain, company: v.company || null, subtype: v.subtype || null }));

  // Same SLD on another extension that's ITSELF for sale → signals the term is a
  // commodity (downward pressure) OR an aftermarket-active term (context).
  const forSaleSiblings = (Array.isArray(variants) ? variants : [])
    .filter((v) => v && v.status === 'for_sale')
    .slice(0, 12)
    .map((v) => ({ domain: v.domain, subtype: v.subtype || null }));

  // A "fundable buyer" count from the angle headliners that verified to a strong/
  // medium ability-to-pay — a quick read on resale demand depth.
  const fundable = (Array.isArray(angles) ? angles : [])
    .map((a) => a.verified)
    .filter((v) => v && v.matched && (v.tier === 'strong' || v.tier === 'medium')).length;

  return {
    angles: (Array.isArray(angles) ? angles : []).map((a) => ({
      key: a.key,
      label: a.label,
      product: Boolean(a.product),
      buyer_potential: a.buyer_potential,
      concept: a.concept,
      players: (a.players || []).slice(0, 5),
      verified: a.verified && a.verified.matched ? {
        name: a.verified.name, domain: a.verified.domain, tier: a.verified.tier,
        employees: a.verified.employees, funding: a.verified.funding, reasons: a.verified.reasons || [],
      } : null,
    })),
    active_users: activeUsers,
    for_sale_siblings: forSaleSiblings,
    fundable_buyer_count: fundable,
  };
}

export default { findBuyers };
