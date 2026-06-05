// Sales Research Agent — firmographic enrichment (the RESOLVE/ranking data layer).
//
// The ONE genuinely paid slot (see SALES_RESEARCH_SPEC.md): given a domain, return
// company firmographics used for ABILITY-TO-PAY qualification + ranking and the
// enrich columns. On-demand, per selected company. We pull the FULL signal set both
// providers expose — size + headcount growth, funding amount/stage/recency/history,
// revenue, departments, phone — because the whole point is judging whether a target
// is realistically at a stage to spend on a domain upgrade.
//
// Provider-agnostic: `firmographics(domain, env)` dispatches via FIRMOGRAPHICS_PROVIDER
// (apollo | pdl | merged). `merged` unions both (Apollo primary — richer + has quota;
// PDL fills gaps, best-effort, its free company-enrich quota is small). Contacts stay
// with RocketReach/FullEnrich.
//
// Standalone:  APOLLO_ENRICH_API_KEY=... node lib/sales/enrich/firmographics.js artificial.io

import { pathToFileURL } from 'node:url';

// Normalized firmographic record (provider-independent). Ability-to-pay fields:
//   employees, headcountGrowth{sixMo,twelveMo,twentyFourMo}, departments,
//   revenue/revenueAmount, funding/fundingAmount, fundingStage, latestFundingDate,
//   fundingRounds, lastRound{date,type,amount,currency,investors}, foundedYear.
//   Plus: company, website, industry, location, description, linkedin, phone, source.

function num(v) { return typeof v === 'number' && Number.isFinite(v) ? v : null; }
function str(v) { return v == null ? null : String(v) || null; }
function clean(obj) {                                   // drop null/empty for tidy growth maps
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v != null) out[k] = v;
  return Object.keys(out).length ? out : null;
}
function posOnly(obj) {                                 // keep only non-zero head counts (drop the noisy 0s)
  if (!obj || typeof obj !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (typeof v === 'number' && v > 0) out[k] = v;
  return Object.keys(out).length ? out : null;
}

// Months between an ISO-ish date and now (null if unparseable).
function monthsAgo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

async function fetchJson(url, headers, { retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, { headers, signal: ctrl.signal });
      if (res.status === 429) {                         // rate limited
        // Honor Retry-After, but only retry when the wait is short (a per-minute
        // burst). A long window (hourly/daily cap) → fail fast so the caller
        // degrades to discovery-only rather than blocking the pipeline.
        const ra = Number(res.headers.get('retry-after'));
        const waitMs = Number.isFinite(ra) ? ra * 1000 : 1000 * 2 ** attempt;
        if (attempt < retries && waitMs <= 10000) { await new Promise((r) => setTimeout(r, waitMs)); continue; }
        throw new Error('429 — rate limited');
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < retries && /aborted|network|fetch failed/i.test(String(e.message))) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt)); continue;
      }
      throw e;
    } finally { clearTimeout(timer); }
  }
  throw lastErr;
}

// Apollo Organization Enrichment: GET /v1/organizations/enrich?domain=<domain>.
// The cheap firmographic call — rich on size/growth/funding (contacts are separate
// and we don't use Apollo for those). Includes 429 backoff (Apollo limits on burst).
export async function firmographicsApollo(domain, env = process.env) {
  const key = env.APOLLO_ENRICH_API_KEY;
  if (!key) throw new Error('APOLLO_ENRICH_API_KEY not set');
  const d = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  if (!d) return null;

  const res = await fetchJson(
    `https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(d)}`,
    { 'x-api-key': key, accept: 'application/json', 'Cache-Control': 'no-cache' },
  );
  if (res.status === 401) throw new Error('Apollo 401 — bad API key');
  if (!res.ok) throw new Error(`Apollo ${res.status}`);
  const body = await res.json();

  const o = body && body.organization;
  if (!o) return null;
  const loc = [o.city, o.state, o.country].filter(Boolean).join(', ') || null;
  const events = Array.isArray(o.funding_events) ? o.funding_events : [];
  const last = events[0] || null;                       // Apollo orders newest-first
  return {
    domain: str(o.primary_domain) || d,
    company: str(o.name),
    website: str(o.website_url),
    employees: num(o.estimated_num_employees),
    headcountGrowth: clean({
      sixMo: num(o.organization_headcount_six_month_growth),
      twelveMo: num(o.organization_headcount_twelve_month_growth),
      twentyFourMo: num(o.organization_headcount_twenty_four_month_growth),
    }),
    departments: posOnly(o.departmental_head_count),
    industry: str(o.industry),
    foundedYear: num(o.founded_year),
    funding: str(o.total_funding_printed) || num(o.total_funding),
    fundingAmount: num(o.total_funding),
    fundingStage: str(o.latest_funding_stage),
    latestFundingDate: str(o.latest_funding_round_date),
    fundingRounds: events.length || null,
    lastRound: last ? clean({
      date: str(last.date), type: str(last.type), amount: str(last.amount),
      currency: str(last.currency), investors: str(last.investors),
    }) : null,
    revenue: str(o.annual_revenue_printed) || num(o.annual_revenue),
    revenueAmount: num(o.annual_revenue) || num(o.organization_revenue),
    location: loc,
    description: str(o.short_description),
    linkedin: str(o.linkedin_url),
    phone: str(o.phone) || (o.primary_phone && str(o.primary_phone.number)) || null,
    source: 'apollo',
  };
}

// People Data Labs Company Enrichment: GET /v5/company/enrich?website=<domain>.
// Flat response. NOTE: our plan has a small company-enrich quota (402
// "all matches used" once spent) and returns no revenue — so PDL is a gap-filler /
// funding-recall top-up, not the primary. Auth via X-Api-Key.
export async function firmographicsPDL(domain, env = process.env) {
  const key = env.PDL_API_KEY;
  if (!key) throw new Error('PDL_API_KEY not set');
  const d = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  if (!d) return null;

  const res = await fetchJson(
    `https://api.peopledatalabs.com/v5/company/enrich?website=${encodeURIComponent(d)}&min_likelihood=2`,
    { 'X-Api-Key': key, accept: 'application/json' },
  );
  if (res.status === 401) throw new Error('PDL 401 — bad API key');
  if (res.status === 402) throw new Error('PDL 402 — quota exhausted (all matches used)');
  if (res.status === 404) return null;                  // no match
  if (!res.ok) throw new Error(`PDL ${res.status}`);
  const o = await res.json();

  if (!o || o.status !== 200) return null;
  const loc = (o.location && (o.location.name
    || [o.location.locality, o.location.region, o.location.country].filter(Boolean).join(', '))) || null;
  return {
    domain: str(o.website) || d,
    company: str(o.display_name) || str(o.name),
    website: str(o.website),
    employees: num(o.employee_count),
    headcountGrowth: num(o.employee_growth_rate?.['12_month']) != null
      ? clean({ twelveMo: num(o.employee_growth_rate['12_month']) }) : null,
    departments: null,
    industry: str(o.industry),
    foundedYear: num(o.founded),
    funding: num(o.total_funding_raised),
    fundingAmount: num(o.total_funding_raised),
    fundingStage: str(o.latest_funding_stage),
    latestFundingDate: str(o.last_funding_date),
    fundingRounds: num(o.number_funding_rounds),
    lastRound: null,
    revenue: str(o.inferred_revenue),                   // absent on our plan → null
    revenueAmount: null,
    location: loc,
    description: str(o.summary),
    linkedin: str(o.linkedin_url),
    phone: null,
    source: 'pdl',
  };
}

const PROVIDERS = { apollo: firmographicsApollo, pdl: firmographicsPDL, merged: firmographicsMerged };

// Field-priority union of Apollo (primary) + PDL (gap-filler). For each field take
// the primary unless null, else the secondary — so we capture the MOST signal across
// both (their funding coverage is complementary). PDL failures are non-fatal.
export async function firmographicsMerged(domain, env = process.env) {
  const [apollo, pdl] = await Promise.all([
    firmographicsApollo(domain, env).catch((e) => { if (/401/.test(String(e.message))) throw e; return null; }),
    firmographicsPDL(domain, env).catch(() => null),    // quota/match miss is expected
  ]);
  if (!apollo && !pdl) return null;
  const primary = apollo || pdl;
  const secondary = apollo ? pdl : null;
  const pick = (f) => (primary[f] != null ? primary[f] : (secondary ? secondary[f] : null));
  const merged = {};
  for (const f of [
    'domain', 'company', 'website', 'employees', 'headcountGrowth', 'departments',
    'industry', 'foundedYear', 'funding', 'fundingAmount', 'fundingStage',
    'latestFundingDate', 'fundingRounds', 'lastRound', 'revenue', 'revenueAmount',
    'location', 'description', 'linkedin', 'phone',
  ]) merged[f] = pick(f);
  merged.source = [apollo && 'apollo', pdl && 'pdl'].filter(Boolean).join('+');
  return merged;
}

// Dispatch to the configured firmographic provider (default merged for max signal).
// Best-effort: returns null on miss/error so the pipeline degrades to discovery-only.
export async function firmographics(domain, env = process.env, provider = env.FIRMOGRAPHICS_PROVIDER || 'merged') {
  const fn = PROVIDERS[provider];
  if (!fn) throw new Error(`unknown firmographics provider: ${provider}`);
  try { return await fn(domain, env); } catch (e) {
    if (/401|API key/.test(String(e.message))) throw e; // surface auth errors
    return null;
  }
}

// ── Ability-to-pay qualifier ───────────────────────────────────────────────────
// Transparent, tunable signal layer (the spine's RANK input; final WEIGHTS are
// Shubham's call — see spec Dependencies). Reads the enriched record and returns
// { tier: 'strong'|'medium'|'low'|'unknown', signals[], reasons[] } so a salesperson
// (and the ranker) can see WHY a company looks able to spend on a domain upgrade.
export function abilityToPay(rec) {
  if (!rec) return { tier: 'unknown', signals: [], reasons: ['no firmographic match'] };
  const reasons = [];
  const signals = [];
  const emp = num(rec.employees) || 0;
  const fund = num(rec.fundingAmount) || 0;
  const rev = num(rec.revenueAmount) || 0;
  const stage = String(rec.fundingStage || '').toLowerCase();
  const raiseMonths = monthsAgo(rec.latestFundingDate);
  const g12 = rec.headcountGrowth && num(rec.headcountGrowth.twelveMo);

  if (fund > 0) { signals.push('funded'); reasons.push(`raised ${rec.funding || fund}${stage ? ` (${rec.fundingStage})` : ''}`); }
  if (raiseMonths != null && raiseMonths <= 24) { signals.push('recent_raise'); reasons.push(`raised ~${raiseMonths}mo ago — cash on hand`); }
  if (rev >= 1e6) { signals.push('revenue'); reasons.push(`revenue ${rec.revenue || rev}`); }
  if (emp >= 50) { signals.push('sizable'); reasons.push(`${emp} employees`); }
  else if (emp >= 10) { signals.push('mid'); reasons.push(`${emp} employees`); }
  else if (emp > 0) { signals.push('small'); reasons.push(`${emp} employees`); }
  if (g12 != null && g12 >= 0.1) { signals.push('growing'); reasons.push(`+${Math.round(g12 * 100)}% headcount /12mo`); }

  const strong = (raiseMonths != null && raiseMonths <= 24) || fund >= 5e6 || emp >= 100 || rev >= 1e7
    || /series\s*[b-z]/.test(stage);
  const medium = fund > 0 || emp >= 20 || rev >= 1e6 || signals.includes('growing') || /seed|series\s*a/.test(stage);
  const tier = strong ? 'strong' : medium ? 'medium' : (signals.length ? 'low' : 'unknown');
  return { tier, signals, reasons };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const domain = process.argv[2] || 'artificial.io';
  const provider = process.env.FIRMOGRAPHICS_PROVIDER || 'merged';
  console.error(`\nFirmographics (${provider}) for ${domain} …\n`);
  const r = await firmographics(domain);
  console.log(JSON.stringify(r, null, 2));
  const atp = abilityToPay(r);
  console.error(`\nAbility to pay: ${atp.tier.toUpperCase()} — [${atp.signals.join(', ')}]`);
  for (const why of atp.reasons) console.error(`  · ${why}`);
  console.error('');
}
