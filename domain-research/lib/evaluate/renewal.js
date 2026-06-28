// TLD renewal cost — the annual CARRYING COST of holding a name (matters for an
// investment hold: a $83/yr .ai renewal eats real margin over a multi-year hold).
// Source = Porkbun's FREE public pricing API (no auth) → registration/renewal/transfer
// for every TLD. Cached in-memory (prices barely change) with a small hardcoded
// fallback so it degrades gracefully if the call fails.

import { getToolLookup, saveToolLookup } from '../db/tools.js';

const PRICING_URL = 'https://api.porkbun.com/api/json/v3/pricing/get';
const DB_TTL_MS = 7 * 24 * 3600 * 1000; // pricing barely changes — refresh weekly

// Representative standard renewals (USD/yr) — fallback only, used if Porkbun is down.
const FALLBACK = {
  com: 11, net: 13, org: 12, info: 20, biz: 18, us: 9, co: 27, io: 52, ai: 83,
  app: 15, dev: 13, xyz: 13, me: 20, tech: 50, online: 35, site: 33, store: 55,
  shop: 35, cloud: 22, tv: 35, gg: 52, sh: 52, vc: 60, design: 45, studio: 30,
};

let CACHE = null;
let CACHE_AT = 0;
const TTL_MS = 6 * 3600 * 1000; // 6h

async function loadPricing() {
  if (CACHE && Date.now() - CACHE_AT < TTL_MS) return CACHE;
  // DB cache (shared across cold starts) — fetched once, refreshed weekly. Avoids a
  // per-eval dependency on Porkbun's (sometimes slow) endpoint.
  try {
    const row = await getToolLookup('pk', 'pricing');
    if (row && row.data && row.data.pricing && Date.now() - (row.data.at || 0) < DB_TTL_MS) {
      CACHE = row.data.pricing;
      CACHE_AT = Date.now();
      return CACHE;
    }
  } catch { /* no DB cache yet */ }
  // Live fetch (NOT util.fetchJson — Porkbun hangs on its custom accept/user-agent
  // headers; a plain content-type-only POST returns fast). Cache to the DB on success.
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let data = null;
    try {
      const res = await fetch(PRICING_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', signal: ctrl.signal });
      if (res.ok) data = await res.json();
    } finally { clearTimeout(timer); }
    if (data && data.pricing && typeof data.pricing === 'object') {
      CACHE = data.pricing;
      CACHE_AT = Date.now();
      try { await saveToolLookup('pk', 'pricing', { pricing: data.pricing, at: Date.now() }); } catch { /* best-effort */ }
    }
  } catch { /* keep stale/null → fallback */ }
  return CACHE;
}

// TLDs that commonly carry REGISTRY-PREMIUM names (premium tier recurs at renewal) —
// so when we can't confirm a per-domain price, we flag that a premium name here may
// renew well above the standard rate.
const PREMIUM_PRONE = new Set(['ai', 'io', 'app', 'dev', 'xyz', 'tech', 'co', 'gg', 'tv', 'design', 'studio', 'vc', 'ax', 'shop', 'store', 'cloud', 'live', 'world', 'agency']);

// tldRenewal(tld) → { cost (USD/yr), source } or null when unknown. STANDARD TLD price.
export async function tldRenewal(tld) {
  const t = String(tld || '').toLowerCase().replace(/^\./, '');
  if (!t) return null;
  const pricing = await loadPricing();
  const row = pricing && pricing[t];
  const live = row && Number(row.renewal) > 0 ? Number(row.renewal) : null;
  if (live != null) return { cost: Math.round(live), source: 'porkbun' };
  if (FALLBACK[t] != null) return { cost: FALLBACK[t], source: 'estimate' };
  return null;
}

// Per-domain renewal, PREMIUM-aware when a (free) Porkbun API key is configured —
// `checkDomain` returns the domain's real price + premium flag. Without keys, falls
// back to the STANDARD TLD price and flags TLDs where premium renewals are common.
//   → { cost, source, premium, premium_possible, standard }
export async function domainRenewal(domain, env = {}) {
  const d = String(domain || '').toLowerCase().trim();
  const dot = d.indexOf('.');
  const tld = dot > 0 ? d.slice(dot + 1) : '';
  const std = await tldRenewal(tld);
  const stdCost = std && std.cost;
  const apikey = env.PORKBUN_API_KEY;
  const secret = env.PORKBUN_SECRET_KEY || env.PORKBUN_SECRET_API_KEY;

  if (apikey && secret && d) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      let body = null;
      try {
        const res = await fetch(`https://api.porkbun.com/api/json/v3/domain/checkDomain/${encodeURIComponent(d)}`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ apikey, secretapikey: secret }), signal: ctrl.signal,
        });
        if (res.ok) body = await res.json();
      } finally { clearTimeout(timer); }
      const resp = body && body.response;
      if (resp) {
        const premium = String(resp.premium || '').toLowerCase() === 'yes';
        const ren = resp.additional && resp.additional.renewal && Number(resp.additional.renewal.price);
        if (ren > 0) return { cost: Math.round(ren), source: 'porkbun_domain', premium, standard: stdCost };
        if (premium && stdCost) return { cost: stdCost, source: std.source, premium: true, standard: stdCost };
      }
    } catch { /* fall back to standard */ }
  }

  if (!std) return null;
  return { cost: std.cost, source: std.source, premium: false, premium_possible: PREMIUM_PRONE.has(tld), standard: std.cost };
}

export default { tldRenewal, domainRenewal };
