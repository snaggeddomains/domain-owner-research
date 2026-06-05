// Sales Research — Keyword/angle gate (Phase 1B, Tier 0/1).
//
// A polysemous seed (piston → automotive parts / auto-service / industrial /
// racing) has several BUYER angles, each an industry whose players would want the
// name even though it isn't in their name (Midas, AutoZone, …). Rather than fan
// out (and spend) on every angle, we show the user a GATE:
//   Tier 0 (free):  one LLM call enumerates the angles + the notable players it
//                   already knows + a buyer-potential read. No discovery spend.
//   Tier 1 (cheap): verify just the HEADLINE company per angle with one
//                   firmographics lookup, so "racing → big funded player" shows a
//                   real company + real funding before you commit.
// The user then picks angles (checkboxes) → the expensive per-angle fan-out
// (Tier 2, separate) runs only on what they chose.
//
// Standalone:  ANTHROPIC_API_KEY=... node lib/sales/discovery/angles.js piston.com

import Anthropic from '@anthropic-ai/sdk';
import { pathToFileURL } from 'node:url';
import { seedParts } from './upgrade.js';
import { firmographics, abilityToPay } from '../enrich/firmographics.js';

// Pull the first {...} JSON object out of a model reply (tolerates prose/fences).
function parseJsonLoose(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

const SYSTEM = `You map a single SEED word/domain to the distinct BUYER ANGLES for selling that domain — the separate industries/interpretations whose companies would plausibly want the name. A polysemous seed has several angles; a narrow one has one or two. For each angle, name the genuinely notable, well-known companies in that space (the kind that could afford a premium domain), with each company's primary website domain. Be honest about buyer potential.

ALSO always include one special angle with key "product_named": companies that have a real PRODUCT, app, service, or feature literally NAMED the seed word — even when the company's own name is completely different (e.g. a company whose flagship product is called the seed word). These exact-match holders are among the highest-intent buyers for the domain. Output STRICT JSON only.`;

function userPrompt(seed) {
  return `SEED: ${seed}

Return JSON:
{
  "angles": [
    {
      "key": "short_snake_case",
      "label": "Human label (e.g. Automotive engine parts)",
      "concept": "one line: what this angle means / what these companies do",
      "industries": ["industry", "..."],
      "buyer_potential": "high|medium|low",
      "rationale": "why a buyer here would want this name (1 sentence)",
      "players": [
        {"name": "Company", "domain": "company.com"}
      ]
    }
  ]
}

Rules:
- ALWAYS include, as the FIRST angle, key "product_named", label 'Companies with a product named "${seed}"': real companies whose PRODUCT / app / service / feature is literally named "${seed}" (the COMPANY may have a totally different name — find them by the product, not the company name). List the real companies + their primary domains. buyer_potential "high". This is the exact-match angle — be thorough.
- Then 2-5 INDUSTRY angles, most promising first. Only real, distinct interpretations.
- 3-6 well-known players per angle, biggest/most-capitalized first, each with a real primary domain (your best knowledge; lowercase, no protocol).
- buyer_potential reflects whether the angle's players are large/funded enough to buy a premium domain.
- JSON only, no prose.`;
}

// Tier 0 — enumerate angles + notable players (free; one LLM call).
export async function enumerateAngles(seedDomain, env = process.env) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const { domain, sld } = seedParts(seedDomain);
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.SALES_ANGLE_MODEL || env.OUTREACH_MODEL || 'claude-sonnet-4-6';
  const resp = await client.messages.create({
    model,
    max_tokens: 1800,
    system: SYSTEM,
    messages: [{ role: 'user', content: userPrompt(sld || domain) }],
  });
  const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const parsed = parseJsonLoose(text);
  const angles = (parsed && Array.isArray(parsed.angles)) ? parsed.angles : [];
  const word = sld || domain;
  // Normalize + clean domains.
  const out = angles.map((a) => {
    const key = String(a.key || a.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40) || 'angle';
    const isProduct = key === 'product_named';
    return {
      key,
      // Flag the exact-match "product named X" angle so the Tier-2 fan-out targets
      // companies whose PRODUCT carries the name (not just industry players).
      product: isProduct,
      label: isProduct ? `Companies with a product named “${word}”` : String(a.label || a.key || 'Angle'),
      concept: isProduct
        ? `Companies whose product, app, or service is literally named “${word}” — exact-match buyers for the domain.`
        : String(a.concept || ''),
      industries: Array.isArray(a.industries) ? a.industries.map(String).slice(0, 6) : [],
      buyer_potential: isProduct ? 'high' : (['high', 'medium', 'low'].includes(a.buyer_potential) ? a.buyer_potential : 'medium'),
      rationale: String(a.rationale || ''),
      players: (Array.isArray(a.players) ? a.players : []).slice(0, 6).map((p) => ({
        name: String(p.name || ''),
        domain: String(p.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, ''),
      })).filter((p) => p.name),
    };
  }).filter((a) => a.label);
  // Guarantee the exact-match angle is present + floated to the top, even if the
  // model didn't emit it (players empty → the Tier-2 fan-out still finds them).
  if (!out.some((a) => a.product)) {
    out.unshift({
      key: 'product_named', product: true,
      label: `Companies with a product named “${word}”`,
      concept: `Companies whose product, app, or service is literally named “${word}” — exact-match buyers for the domain.`,
      industries: [], buyer_potential: 'high', rationale: 'Exact-match product holders are the highest-intent buyers.', players: [],
    });
  } else {
    out.sort((a, b) => (b.product === true) - (a.product === true));   // product angle first
  }
  return out;
}

// Tier 1 — verify the headline company per angle with one firmographics lookup
// (real size/funding/ability-to-pay), so the gate decision is grounded. Cheap:
// ~1 credit per angle. Best-effort; a miss leaves the LLM preview intact.
export async function verifyHeadliners(angles, env = process.env) {
  return Promise.all(angles.map(async (a) => {
    const head = a.players.find((p) => p.domain);
    if (!head) return { ...a, verified: null };
    let firmo = null;
    try { firmo = await firmographics(head.domain, env); } catch { firmo = null; }
    if (!firmo) return { ...a, verified: { name: head.name, domain: head.domain, matched: false } };
    const atp = abilityToPay(firmo);
    return {
      ...a,
      verified: {
        name: firmo.company || head.name,
        domain: firmo.domain || head.domain,
        matched: true,
        employees: firmo.employees,
        revenue: firmo.revenue,
        funding: firmo.funding,
        location: firmo.location,
        tier: atp.tier,
        reasons: atp.reasons,
      },
    };
  }));
}

// Tier 0 + 1 in one call (what the API serves to the gate).
export async function anglesForSeed(seedDomain, env = process.env, { verify = true } = {}) {
  const base = await enumerateAngles(seedDomain, env);
  return verify ? verifyHeadliners(base, env) : base.map((a) => ({ ...a, verified: null }));
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seed = process.argv[2] || 'piston.com';
  const verify = !process.argv.includes('--no-verify');
  console.error(`\nAngle gate for ${seed}${verify ? ' (+ Tier-1 verify)' : ''} …\n`);
  const angles = await anglesForSeed(seed, process.env, { verify });
  for (const a of angles) {
    console.log(`\n■ ${a.label}  [buyer potential: ${a.buyer_potential}]`);
    console.log(`  ${a.concept}`);
    console.log(`  players: ${a.players.map((p) => `${p.name} (${p.domain || '—'})`).join(', ')}`);
    if (a.verified && a.verified.matched) {
      const v = a.verified;
      console.log(`  ✓ headliner ${v.name}: ${v.tier} — ${(v.reasons || []).join(' · ')}`);
    } else if (a.verified) {
      console.log(`  · headliner ${a.verified.name}: no firmographic match`);
    }
  }
  console.log('');
}
