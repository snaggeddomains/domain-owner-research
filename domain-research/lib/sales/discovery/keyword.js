// Sales Research — Keyword/angle Tier-2 discovery (per-angle company fan-out).
//
// For each chosen angle, the LLM expands to the real companies in that industry
// AND, for FREE, ranks each: a fit tier (high|medium|low — how likely they'd want
// the domain + can afford it) and a one-line WHY. We then liveness-check every
// site (drop dead/unreachable domains). The survivors land in the buyers list
// UNQUALIFIED, sorted by the LLM fit so the recommended ones rise to the top —
// you eyeball the why-lines and tick which to QUALIFY (the Apollo spend). No
// firmographics here, so discovery stays free.
//
// Standalone:  ANTHROPIC_API_KEY=... node lib/sales/discovery/keyword.js piston.com

import Anthropic from '@anthropic-ai/sdk';
import { pathToFileURL } from 'node:url';
import { seedParts } from './upgrade.js';
import { classifyDomain } from '../classify.js';

function parseJsonLoose(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}
const cleanDomain = (d) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
const FIT_SCORE = { high: 2.5, medium: 1.5, low: 0.5 };

// LLM-expand one angle into up to `limit` real companies, each with a fit tier +
// a one-line reason this company would want the seed domain.
async function expandAngle(seed, angle, env, limit) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 60000, maxRetries: 2 });
  const model = env.SALES_ANGLE_MODEL || env.OUTREACH_MODEL || 'claude-sonnet-4-6';
  const word = String(seed).split('.')[0];
  // The exact-match "product named X" angle hunts by PRODUCT, not industry — find
  // companies whose product/app/service is literally named the seed word, even when
  // the company itself is named something else entirely (the highest-intent buyers).
  const prompt = angle.product
    ? `We are selling the premium domain "${seed}". List up to ${limit} REAL companies that have a PRODUCT, app, service, or feature literally NAMED "${word}" — the COMPANY usually has a DIFFERENT name (find them by the product, not the company name). For EACH, give the company's primary website domain, a FIT rating, and a one-line WHY naming the product.

FIT = how strong a buyer they'd be for "${seed}":
  "high"   = the product named "${word}" is a flagship/major product AND the company is well-capitalized
  "medium" = a real but secondary product, or a mid-size company
  "low"    = a minor/legacy product or a company too small to pay

Return JSON only:
{"companies":[{"name":"Company","domain":"company.com","product":"the EXACT product name as they brand it","fit":"high|medium|low","why":"product \\"${word}\\" is their ..."}]}
Real companies with a genuinely named-"${word}" product only — do NOT pad with companies that merely operate in a related space. Give the product name EXACTLY as the company writes it (so "${word}", "${word}s", "${word} Pro" etc. are distinguishable). Order best fit first. No placeholders.`
    : `We are selling the premium domain "${seed}". For the buyer angle below, list up to ${limit} REAL companies who could plausibly want it. For EACH, give: its primary website domain, a FIT rating, and a one-line WHY.

ANGLE: ${angle.label} — ${angle.concept || ''}

FIT = how strong a buyer they'd be for "${seed}", weighing (a) how much the name fits their brand/positioning and (b) whether they can afford a premium domain (size/funding):
  "high"   = great brand fit AND well-capitalized — recommend reaching out
  "medium" = plausible fit or mid-size
  "low"    = weak fit or too small to pay

Return JSON only:
{"companies":[{"name":"Company","domain":"company.com","fit":"high|medium|low","why":"one line: why THIS company would want the name"}]}
Real companies + real domains only. Order best fit first. No placeholders.`;
  const resp = await client.messages.create({ model, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] });
  const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const parsed = parseJsonLoose(text);
  const arr = (parsed && Array.isArray(parsed.companies)) ? parsed.companies : [];
  return arr.map((c) => ({
    name: String(c.name || '').trim(),
    domain: cleanDomain(c.domain),
    fit: ['high', 'medium', 'low'].includes(c.fit) ? c.fit : 'medium',
    why: String(c.why || '').trim(),
    product: String(c.product || '').trim(),
  })).filter((c) => c.name && c.domain);
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

// Discover companies for the chosen angles → live, UNQUALIFIED candidates
// (category 'keyword', tagged by angle, fit-scored, with a why). FREE — no Apollo.
export async function discoverAngles(seedDomain, angles, env = process.env, { limitPerAngle = 15, cap = 80, concurrency = 30 } = {}) {
  const { domain, sld } = seedParts(seedDomain);
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const lim = Math.max(1, Math.min(Number(limitPerAngle) || 15, 60));
  const seen = new Set([domain]);
  const raw = [];
  // Expand every angle in PARALLEL (sequential LLM calls timed out the handler).
  const expandedAll = await Promise.all(angles.map((a) => expandAngle(domain, a, env, lim).catch(() => [])));
  for (let ai = 0; ai < angles.length; ai++) {
    const a = angles[ai];
    const expanded = expandedAll[ai] || [];
    const gatePlayers = (Array.isArray(a.players) ? a.players : []).map((p) => ({ name: p.name, domain: cleanDomain(p.domain), fit: 'medium', why: '' }));
    let perAngle = 0;
    for (const c of [...expanded, ...gatePlayers]) {
      if (!c.domain || seen.has(c.domain)) continue;
      seen.add(c.domain);
      // On the product angle, flag an EXACT product-name match (playmaker == "Playmaker",
      // not "Playmaker's"/"PlayerMaker") — a much stronger, very-qualified signal.
      const exact = !!(a.product && c.product && norm(c.product) === norm(sld));
      const angleKey = a.product ? (exact ? 'product_named_exact' : 'product_named') : (a.key || null);
      raw.push({ ...c, angle: angleKey, exact });
      if (++perAngle >= lim || raw.length >= cap) break;
    }
    if (raw.length >= cap) break;
  }
  if (!raw.length) return [];

  // Classify every site with the SAME for-sale/parked detection the upgrade path
  // uses — so a for-sale lander that returns HTTP 200 (e.g. graphicedge.com) is
  // demoted, not shown as a live buyer. Drop dead sites; keep for-sale ones (they
  // carry status 'for_sale' → the UI sections them into "Others").
  const classified = await mapPool(raw, concurrency, async (c) => ({ c, status: await classifyDomain(c.domain) }));
  return classified.filter((x) => x.status !== 'inactive').map(({ c, status }) => ({
    domain: c.domain,
    company: c.name || null,
    company_url: `https://${c.domain}`,
    subtype: 'angle',
    category: 'keyword',
    angle: c.angle,
    status,
    qualification: { tier: 'unknown', reasons: c.why ? [c.why] : [] },  // why-line shown in the card
    // LLM fit drives the sort; an EXACT product-name match gets a boost so it floats
    // to the top of the Product section (and clears the "recommended" bar).
    score: (FIT_SCORE[c.fit] ?? 1) + (c.exact ? 1.5 : 0),
  }));
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seed = process.argv[2] || 'piston.com';
  const { anglesForSeed } = await import('./angles.js');
  const angles = await anglesForSeed(seed, process.env, { verify: false });
  const top = angles.filter((a) => a.buyer_potential === 'high').slice(0, 2);
  console.error(`\nAngle Tier-2 discovery for ${seed} (${top.length} angles) …\n`);
  const out = await discoverAngles(seed, top, process.env, { limitPerAngle: 15 });
  out.sort((a, b) => b.score - a.score);
  const pad = (s, n) => String(s ?? '').slice(0, n).padEnd(n);
  for (const c of out) console.log(pad(c.company || '—', 30), pad(c.domain, 26), pad(`fit ${c.score}`, 8), (c.qualification.reasons[0] || '').slice(0, 50));
  console.log(`\n${out.length} live companies (unqualified)\n`);
}
