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
{"companies":[{"name":"Company","domain":"company.com","fit":"high|medium|low","why":"product \\"${word}\\" is their ..."}]}
Real companies with a genuinely named-"${word}" product only — do NOT pad with companies that merely operate in a related space. Order best fit first. No placeholders.`
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
  })).filter((c) => c.name && c.domain);
}

// Does the site actually serve a working page? Live = 2xx/3xx, or an auth/bot
// gate (401/403/429) that still proves the site exists. Dead = 404, any 5xx
// (e.g. 503 "unavailable"), or a network/DNS failure → excluded.
const LIVE_TIMEOUT = 5000;
async function liveCheck(domain) {
  const probe = async (url) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), LIVE_TIMEOUT);
    try {
      const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal });
      return res.status < 400 || res.status === 401 || res.status === 403 || res.status === 429;
    } catch { return false; }
    finally { clearTimeout(t); }
  };
  return (await probe(`https://${domain}/`)) || (await probe(`http://${domain}/`));
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
  const { domain } = seedParts(seedDomain);
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
      raw.push({ ...c, angle: a.key || null });
      if (++perAngle >= lim || raw.length >= cap) break;
    }
    if (raw.length >= cap) break;
  }
  if (!raw.length) return [];

  // Liveness-check every site; drop the ones that don't load.
  const live = await mapPool(raw, concurrency, async (c) => ({ c, ok: await liveCheck(c.domain) }));
  return live.filter((x) => x.ok).map(({ c }) => ({
    domain: c.domain,
    company: c.name || null,
    company_url: `https://${c.domain}`,
    subtype: 'angle',
    category: 'keyword',
    angle: c.angle,
    status: 'active',
    qualification: { tier: 'unknown', reasons: c.why ? [c.why] : [] },  // why-line shown in the card
    score: FIT_SCORE[c.fit] ?? 1,                                       // LLM fit drives the sort
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
