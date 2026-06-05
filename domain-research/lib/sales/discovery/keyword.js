// Sales Research — Keyword/angle Tier-2 discovery (per-angle company fan-out).
//
// For each angle the user picked at the gate, expand to the fuller set of real
// companies in that industry (the LLM knows the players) + merge the gate's known
// players. This is FREE (LLM only). The companies land in the buyers list
// UNQUALIFIED — no firmographics, no Apollo. The user then manually ticks which to
// qualify (api/sales.js 'qualify'), so the paid step stays behind a human gate.
//
// Default 15 companies/angle; the caller can override (the user opting into more
// spend on the qualify step). No per-company HTTP at discovery, so a bigger
// override never times out.
//
// Standalone:  ANTHROPIC_API_KEY=... node lib/sales/discovery/keyword.js piston.com

import Anthropic from '@anthropic-ai/sdk';
import { pathToFileURL } from 'node:url';
import { seedParts } from './upgrade.js';

function parseJsonLoose(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}
const cleanDomain = (d) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

// LLM-expand one angle into up to `limit` real companies (biggest first) + domains.
async function expandAngle(seed, angle, env, limit) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.SALES_ANGLE_MODEL || env.OUTREACH_MODEL || 'claude-sonnet-4-6';
  const prompt = `We are selling the premium domain "${seed}". List up to ${limit} REAL, notable companies in the buyer angle below who could plausibly want it — biggest / most-capitalized / best-known first. Each with its primary website domain (lowercase, no protocol, no path).

ANGLE: ${angle.label} — ${angle.concept || ''}

Return JSON only: {"companies":[{"name":"Company","domain":"company.com"}]}
Real companies with real domains only. No placeholders.`;
  const resp = await client.messages.create({ model, max_tokens: 2400, messages: [{ role: 'user', content: prompt }] });
  const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const parsed = parseJsonLoose(text);
  const arr = (parsed && Array.isArray(parsed.companies)) ? parsed.companies : [];
  return arr.map((c) => ({ name: String(c.name || '').trim(), domain: cleanDomain(c.domain) }))
    .filter((c) => c.name && c.domain);
}

// Discover companies for the chosen angles → UNQUALIFIED candidates (category
// 'keyword', tagged by angle, no firmographics). FREE — no Apollo.
export async function discoverAngles(seedDomain, angles, env = process.env, { limitPerAngle = 15 } = {}) {
  const { domain } = seedParts(seedDomain);
  const lim = Math.max(1, Math.min(Number(limitPerAngle) || 15, 60));
  const seen = new Set([domain]);
  const out = [];
  for (const a of angles) {
    let expanded = [];
    try { expanded = await expandAngle(domain, a, env, lim); } catch { expanded = []; }
    let perAngle = 0;
    for (const c of [...(Array.isArray(a.players) ? a.players : []), ...expanded]) {
      const d = cleanDomain(c.domain);
      if (!d || seen.has(d)) continue;
      seen.add(d);
      out.push({
        domain: d,
        company: c.name || null,
        company_url: `https://${d}`,
        subtype: 'angle',
        category: 'keyword',
        angle: a.key || null,
        status: 'active',                       // assumed live; the qualify step verifies
        qualification: { tier: 'unknown', reasons: [] },
        score: 0,
      });
      if (++perAngle >= lim) break;
    }
  }
  return out;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seed = process.argv[2] || 'piston.com';
  const { anglesForSeed } = await import('./angles.js');
  const angles = await anglesForSeed(seed, process.env, { verify: false });
  const top = angles.filter((a) => a.buyer_potential === 'high').slice(0, 2);
  console.error(`\nAngle Tier-2 discovery for ${seed} (${top.length} angles) …\n`);
  const out = await discoverAngles(seed, top, process.env, { limitPerAngle: 15 });
  const pad = (s, n) => String(s ?? '').slice(0, n).padEnd(n);
  for (const c of out) console.log(pad(c.company || '—', 36), pad(c.domain, 30), c.angle);
  console.log(`\n${out.length} companies (unqualified)\n`);
}
