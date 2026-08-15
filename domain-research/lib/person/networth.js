// Net Worth — a STANDALONE, FREE estimate tool. Same inputs as the person deep-dive
// (a social/LinkedIn URL or an email), but it spends NO paid credits: it does a free
// identify (read_url + free web_search + free rocketreach_search) and sources company
// financials from FREE web search (an LLM extracts funding/valuation/employees from the
// snippets) — NOT Apollo/RocketReach-lookup. Output is a rough ability-to-pay signal
// (a low/mid/high range + band + the weighted components), never a verified figure.
//
// Deterministic core (computeNetWorth) is pure + testable. The estimate weights:
//   1. FOUNDER EQUITY — ownership stake (by funding stage) × estimated company
//      valuation × a heavy illiquidity discount (private equity is not cash).
//   2. EXECUTIVE COMP — a salaried senior's accumulated compensation (a floor).
//   3. CREATOR / AUDIENCE — a rough income proxy off a follower count when known.
//   4. DISCLOSED — an authoritative override when a credible public figure exists
//      (Forbes / filings), adjudicated by the LLM to avoid a namesake.
//   5. BASELINE — a seniority floor so a clearly-employed exec never reads $0.
// Runs inline (free + fast) — no Inngest, no paid vendor.
import Anthropic from '@anthropic-ai/sdk';
import { runTool } from '../sources/index.js';
import { recordModelUsage } from '../db/usage.js';

const FOUNDER_RE = /\b(founder|co-?founder|owner|proprietor|principal|managing partner|general partner|chairman|chairwoman|chair of)\b/i;
const CLEVEL_RE = /\b(ceo|chief executive|coo|cfo|cto|cmo|cro|chief \w+ officer|president)\b/i;
const VP_RE = /\b(svp|evp|\bvp\b|vice president|head of|director|partner|managing director)\b/i;

// Per-stage founder equity retained (single founder, rough) + a valuation multiple
// on TOTAL raised (total raised ≈ a fraction of current valuation for a healthy co).
const STAGE = {
  'pre-seed': { stake: 0.32, valMult: 6 },
  'angel': { stake: 0.30, valMult: 6 },
  'seed': { stake: 0.22, valMult: 5 },
  'series a': { stake: 0.16, valMult: 4 },
  'series b': { stake: 0.11, valMult: 3.5 },
  'series c': { stake: 0.08, valMult: 3 },
  'series d': { stake: 0.06, valMult: 2.6 },
  'series e': { stake: 0.05, valMult: 2.3 },
  'series f': { stake: 0.04, valMult: 2.1 },
};

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function money(n) {
  if (!(n > 0)) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}
function fmtCount(n) {
  if (!(n > 0)) return null;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return String(n);
}
function bandFor(mid) {
  if (mid == null || !(mid > 0)) return 'unknown';
  if (mid < 1e6) return '<$1M';
  if (mid < 1e7) return '$1M–$10M';
  if (mid < 5e7) return '$10M–$50M';
  if (mid < 2.5e8) return '$50M–$250M';
  return '$250M+';
}
function execComp(isC, emp) {
  if (isC) { if (emp >= 1000) return 6e5; if (emp >= 200) return 4e5; if (emp >= 50) return 3e5; return 2e5; }
  if (emp >= 1000) return 3e5; if (emp >= 200) return 2.2e5; if (emp >= 50) return 1.8e5; return 1.4e5;
}
function parseJsonLoose(text) {
  if (!text) return null;
  const c = String(text).replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(c); } catch { /* slice */ }
  const a = c.indexOf('{'); const b = c.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(c.slice(a, b + 1)); } catch { /* give up */ } }
  return null;
}

// ── deterministic core (pure) ──────────────────────────────────────────────────
// firmo (any/all optional): { fundingAmount, fundingStage, funding(label), valuation,
// revenueAmount, revenue(label), employees }.
export function computeNetWorth({ title, firmo, maxFollowers = 0 }) {
  const components = [];
  const t = String(title || '').toLowerCase();
  const isFounder = FOUNDER_RE.test(t);
  const isC = CLEVEL_RE.test(t);
  const isVp = VP_RE.test(t);
  const fund = num(firmo?.fundingAmount);
  const rev = num(firmo?.revenueAmount);
  const emp = num(firmo?.employees);
  const stage = String(firmo?.fundingStage || '').toLowerCase();

  // Valuation estimate (drives founder equity). A directly-known valuation wins.
  let valuation = num(firmo?.valuation); let valBasis = valuation > 0 ? 'reported valuation' : null;
  if (!valuation) {
    if (fund > 0) { const s = STAGE[stage] || { valMult: 4 }; valuation = fund * s.valMult; valBasis = `~${s.valMult}× total raised (${firmo?.funding || money(fund)}${stage ? `, ${firmo.fundingStage}` : ''})`; }
    else if (rev >= 5e5) { valuation = rev * 3; valBasis = `~3× revenue (${firmo?.revenue || money(rev)})`; }
    else if (emp >= 5) { valuation = emp * 2e5; valBasis = `~$200K × ${emp.toLocaleString()} employees`; }
  }

  let coreMid = 0; let coreLow = 0; let coreHigh = 0; let coreLabel = null;
  if (isFounder && valuation > 0) {
    const stake = (STAGE[stage] && STAGE[stage].stake) || (fund > 0 ? 0.12 : 0.30);
    coreMid = valuation * stake * 0.35; coreLow = valuation * stake * 0.18; coreHigh = valuation * stake * 0.55;
    coreLabel = 'founder_equity';
    components.push({ label: 'Founder equity', detail: `~${Math.round(stake * 100)}% of an est. ${money(valuation)} company (${valBasis}), illiquidity-discounted`, mid: Math.round(coreMid) });
  } else if (isFounder) {
    coreMid = 8e5; coreLow = 1e5; coreHigh = 5e6; coreLabel = 'founder_nofirmo';
    components.push({ label: 'Founder (company not valued)', detail: 'wide range — no funding/valuation found in public results', mid: coreMid });
  } else if (isC || isVp) {
    const annual = execComp(isC, emp);
    coreMid = annual * 8 * 0.25; coreLow = coreMid * 0.5; coreHigh = coreMid * 2.2; coreLabel = 'exec_comp';
    components.push({ label: 'Executive compensation', detail: `~${money(annual)}/yr ${isC ? 'C-level' : 'senior'} comp accumulated${emp ? ` at a ${emp.toLocaleString()}-person company` : ''}`, mid: Math.round(coreMid) });
  }

  let creMid = 0; let creLow = 0; let creHigh = 0;
  if (maxFollowers >= 25e3) {
    const annual = maxFollowers * 0.10;
    creMid = annual * 5 * 0.4; creLow = annual * 3 * 0.2; creHigh = annual * 8 * 0.7;
    components.push({ label: 'Creator / audience', detail: `${fmtCount(maxFollowers)} followers (income proxy)`, mid: Math.round(creMid) });
  }

  const floor = (isFounder || isC) ? 25e4 : isVp ? 15e4 : title ? 75e3 : 25e3;
  let mid = Math.max(coreMid + creMid, floor);
  let low = Math.max(coreLow + creLow, floor * 0.4);
  let high = Math.max(coreHigh + creHigh, floor * 1.5);
  if (high < mid) high = mid * 1.5;
  if (low > mid) low = mid * 0.5;

  let confidence = 'low';
  if (coreLabel === 'founder_equity' && (valuation > 0)) confidence = 'medium';
  else if (firmo && (isC || isVp)) confidence = 'medium';

  return {
    low: Math.round(low), mid: Math.round(mid), high: Math.round(high),
    band: bandFor(mid), confidence, components, coreLabel,
    role: isFounder ? 'founder' : isC ? 'c_level' : isVp ? 'senior' : title ? 'professional' : 'unknown',
    valuation: Math.round(valuation) || null,
  };
}

// ── free identify (NO paid credits) ──────────────────────────────────────────────
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const BAD_HOST = /(linkedin|twitter|x\.com|facebook|instagram|crunchbase|wikipedia|youtube|bloomberg|glassdoor|indeed|zoominfo|pitchbook|reuters|forbes|medium|github|angel\.co|wellfound)\./i;

async function webSearch(query, env) {
  const r = await runTool('web_search', { query }, env).catch(() => null);
  return r && r.ok ? r.data : null;
}
function nameFromTitle(title) {
  if (!title) return null;
  let t = String(title).split(/\s*[|–—\-\/(]\s*|\s*[·•]\s*/)[0].trim();
  if (t.length < 2 || t.length > 60 || /[@#]/.test(t)) return null;
  return t;
}
function nameFromWeb(web) {
  if (!web) return null;
  const kg = web.knowledge_graph;
  if (kg && kg.title && /^[A-Z][a-z]+ [A-Z][a-z'.-]+/.test(kg.title)) return kg.title;
  for (const r of web.results || web.organic || []) {
    if (/linkedin\.com/i.test(r.link || r.url || '') || /\|\s*LinkedIn/i.test(r.title || '')) {
      const n = nameFromTitle(r.title || ''); if (n) return n;
    }
  }
  return null;
}

const FREEMAIL = /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|icloud|me|aol|proton|protonmail|pm|gmx|mail|hey|fastmail|zoho)\./i;
function applyRr(subject, d) {
  if (!d) return;
  subject.name = subject.name || d.name || null;
  subject.title = subject.title || d.current_title || d.title || null;
  subject.company = subject.company || d.current_employer || null;
  subject.linkedin_url = subject.linkedin_url || d.linkedin_url || null;
}

// Identify name / title / company / linkedin. Uses the RocketReach LOOKUP (~1 credit)
// to reliably reverse-resolve the person (by email or LinkedIn URL) — the free
// rocketreach_search was unreliable (a bad email resolved to a company; a LinkedIn URL
// came back role-less). Falls back to read_url + web_search + free rocketreach_search.
// (Still no Apollo/FullEnrich — the expensive enrichment stays off.)
export async function identifyPerson({ url, email, name, env }) {
  const subject = { name: name || null, title: null, company: null, company_domain: null, linkedin_url: null, input: url || email };
  const seedEmail = email && EMAIL_RE.test(String(email).trim()) ? String(email).trim().toLowerCase()
    : (url && !/^https?:\/\//i.test(url) && EMAIL_RE.test(String(url).trim()) ? String(url).trim().toLowerCase() : null);

  if (seedEmail) {
    const dom = seedEmail.split('@')[1] || null;
    subject.company_domain = dom && !FREEMAIL.test(dom) ? dom : null;   // never treat gmail as the company
    // RocketReach reverse-lookup by email (~1 credit) — the reliable person resolve.
    const rr = await runTool('rocketreach_lookup', { email: seedEmail }, env).catch(() => null);
    if (rr && rr.ok && rr.data && rr.data.found) applyRr(subject, rr.data);
    if (!subject.name) subject.name = nameFromWeb(await webSearch(`"${seedEmail}"`, env));
    if (!subject.name && dom) subject.name = nameFromWeb(await webSearch(`${seedEmail.split('@')[0].replace(/[._-]+/g, ' ')} ${dom}`, env));
  } else if (url) {
    if (/linkedin\.com/i.test(url)) subject.linkedin_url = url.split('?')[0];  // strip utm/query
    // RocketReach lookup by LinkedIn URL (~1 credit) → title/company reliably.
    if (subject.linkedin_url) {
      const rr = await runTool('rocketreach_lookup', { linkedin_url: subject.linkedin_url }, env).catch(() => null);
      if (rr && rr.ok && rr.data && rr.data.found) applyRr(subject, rr.data);
    }
    if (!subject.name) { const page = await runTool('read_url', { url }, env).catch(() => null); if (page && page.ok && page.data) subject.name = nameFromTitle(page.data.title); }
  }

  // Fill any gaps with the FREE rocketreach_search (no credit).
  if (!subject.title || !subject.company) {
    const rrArgs = subject.linkedin_url ? { linkedin_url: subject.linkedin_url } : subject.name ? { name: subject.name } : null;
    if (rrArgs) {
      const r = await runTool('rocketreach_search', rrArgs, env).catch(() => null);
      const p = (r && r.ok && ((r.data?.profiles || r.data?.results || r.data?.data || [])[0])) || null;
      applyRr(subject, p);
    }
  }
  return subject;
}

// ── free company financials (web search + LLM extract; NO Apollo) ────────────────
const FIN_SYSTEM = `Extract a company's public FINANCIAL profile from web-search snippets. Only use figures ACTUALLY stated in the results — never guess. Convert to plain USD numbers (e.g. "$12M raised" → 12000000, "Series B" stage). Return STRICT JSON:
{"funding_total_usd": <number|null>, "funding_stage": "<seed|series a|series b|...|null>", "valuation_usd": <number|null>, "employees": <number|null>, "revenue_usd": <number|null>, "note": "<one short line on what you found, or empty>"}`;

async function freeCompanyFinancials({ company, env }) {
  if (!company || !env.ANTHROPIC_API_KEY) return null;
  const a = await webSearch(`${company} funding raised valuation`, env);
  const b = await webSearch(`${company} employees revenue`, env);
  const snip = (w) => (w && (w.results || w.organic) || []).slice(0, 6).map((r) => `- ${r.title || ''}: ${(r.snippet || r.description || '').slice(0, 200)}`).join('\n');
  const kg = (a && a.knowledge_graph) ? `KNOWLEDGE PANEL: ${JSON.stringify(a.knowledge_graph).slice(0, 400)}\n` : '';
  const body = `COMPANY: ${company}\n${kg}FUNDING RESULTS:\n${snip(a)}\n\nSIZE RESULTS:\n${snip(b)}`;
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 15000, maxRetries: 1 });
    const model = env.PERSON_MODEL || env.OUTREACH_MODEL || 'claude-sonnet-4-6';
    const resp = await client.messages.create({
      model, max_tokens: 300,
      system: [{ type: 'text', text: FIN_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `${body}\n\nReturn the JSON now.` }],
    });
    recordModelUsage('anthropic', model, resp.usage);
    const j = parseJsonLoose((resp.content || []).filter((x) => x.type === 'text').map((x) => x.text).join(''));
    if (!j) return null;
    const f = {
      fundingAmount: num(j.funding_total_usd) || 0,
      fundingStage: j.funding_stage || null,
      valuation: num(j.valuation_usd) || 0,
      employees: num(j.employees) || 0,
      revenueAmount: num(j.revenue_usd) || 0,
      note: j.note || null,
      source: 'web',
    };
    f.funding = f.fundingAmount ? money(f.fundingAmount) : null;
    f.revenue = f.revenueAmount ? money(f.revenueAmount) : null;
    if (!f.fundingAmount && !f.valuation && !f.employees && !f.revenueAmount) return null;
    return f;
  } catch { return null; }
}

// ── LLM narrative + disclosed-figure adjudication + bounded nudge ────────────────
const NW_SYSTEM = `You are a wealth-estimation analyst producing a ROUGH net-worth ESTIMATE for ONE person — an ability-to-pay signal for a domain negotiation. You get the identified person, their company's public financials (if found), a deterministic PRIOR estimate, and raw web-search results. YOU produce the headline estimate (low/mid/high in USD); the deterministic prior is just a floor to sanity-check against — it is often a severe UNDER-estimate when it lacks company financials, so do not anchor to it when the evidence says otherwise.

WHAT NET WORTH MEANS — calibrate to this:
- FOUNDER / co-founder of a venture-backed company: wealth is dominated by their EQUITY STAKE × the company's valuation (illiquid but real). A company that raised hundreds of millions and/or reached "unicorn" ($1B+) status implies a founder net worth in the TENS OF MILLIONS at minimum, even after dilution (a founder typically still holds 5–25%). A seed/early startup that raised a few million → low single-digit millions. A major exit/acquisition → tens to hundreds of millions.
- VENTURE-CAPITAL / investment PARTNER (a fund with $X under management): wealth from carry + personal investing. A partner/principal at a fund managing $1B+ is typically worth millions to tens of millions. (Managing $1B is NOT owning $1B — do not equate AUM with personal wealth — but it is a strong high-net-worth signal.)
- PUBLIC-COMPANY CEO / senior exec: equity + comp; often tens of millions at a large company.
- SALARIED NON-founder exec at a private company: accumulated compensation — typically under a few million.
- A publicly DISCLOSED figure (Forbes / filing) for THIS person overrides everything.

RULES:
- GROUND every figure in a concrete signal (funding amount, valuation, "unicorn", AUM, exit, disclosed number, seniority). If you truly have NO wealth signal, keep it modest. Never invent a company or figure. Ranges may be WIDE to reflect genuine uncertainty.
- NAMESAKE GUARD: only attribute a disclosed figure or signals to THIS person if the name AND role/company are consistent. A same-name actor/athlete/other does NOT count.
- NOT A PERSON: if the subject is actually a company / brand / org (not a named human), set is_individual=false and leave the estimate fields null.

Return STRICT JSON only: {"is_individual": true|false, "rationale":"2-3 sentences naming the driver, framed as a rough estimate", "driver":"founder_equity|vc_carry|exec_comp|public_exec|creator|mixed|unknown", "estimate_low": <usd number|null>, "estimate_mid": <usd number|null>, "estimate_high": <usd number|null>, "disclosed_value": <number|null>, "disclosed_source":"<url or name|null>", "confidence":"high|medium|low", "caveat":"one short caveat line"}`;

async function narrate({ subject, firmo, core, web, env }) {
  if (!env.ANTHROPIC_API_KEY) return null;
  const lines = [];
  lines.push(`PERSON: ${subject.name || 'unknown'}`);
  lines.push(`ROLE: ${subject.title || 'unknown'}${subject.company ? ` @ ${subject.company}` : ''}`);
  if (firmo) lines.push(`COMPANY FINANCIALS (public web): employees=${firmo.employees || '?'}, funding=${firmo.funding || '?'}, stage=${firmo.fundingStage || '?'}, valuation=${firmo.valuation ? money(firmo.valuation) : '?'}, revenue=${firmo.revenue || '?'}`);
  lines.push(`DETERMINISTIC PRIOR (floor only): ${money(core.low)}–${money(core.high)} (mid ${money(core.mid)})`);
  lines.push(`PRIOR COMPONENTS: ${core.components.map((c) => `${c.label} ~${money(c.mid)}`).join('; ') || 'none'}`);
  const results = (web && (web.results || web.organic)) || [];
  if (web && web.knowledge_graph) lines.push(`KNOWLEDGE PANEL: ${JSON.stringify(web.knowledge_graph).slice(0, 400)}`);
  if (results.length) lines.push(`WEB RESULTS ("net worth" + context):\n${results.slice(0, 8).map((r) => `- ${r.title || ''} — ${(r.snippet || r.description || '').slice(0, 180)} [${r.link || r.url || ''}]`).join('\n')}`);
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 18000, maxRetries: 1 });
    const model = env.PERSON_MODEL || env.OUTREACH_MODEL || 'claude-sonnet-4-6';
    const resp = await client.messages.create({
      model, max_tokens: 600,
      system: [{ type: 'text', text: NW_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `${lines.join('\n')}\n\nReturn the JSON now.` }],
    });
    recordModelUsage('anthropic', model, resp.usage);
    return parseJsonLoose((resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join(''));
  } catch { return null; }
}

function defaultRationale(core, company) {
  const drv = core.coreLabel === 'founder_equity' ? `founder equity in ${company || 'their company'}`
    : core.coreLabel === 'exec_comp' ? 'accumulated executive compensation'
      : core.coreLabel === 'founder_nofirmo' ? 'their founder role (company not valued)'
        : 'their professional profile';
  return `Estimated primarily from ${drv}. Rough figure — treat as an ability-to-pay signal, not a verified net worth.`;
}

// ── public entry — the whole free flow ───────────────────────────────────────────
export async function runNetWorth({ url, email, name, env = process.env }) {
  const subject = await identifyPerson({ url, email, name, env });
  if (name && !subject.name) subject.name = name;
  if (!subject.title && !subject.company && !subject.name) {
    return { ok: false, error: 'Could not identify a person from that input.', subject };
  }
  const estimate = await estimateForSubject({ subject, env });
  return { ok: true, subject, ...estimate };
}

// Estimate from an already-identified subject. The LLM is the PRIMARY estimator
// (grounded in company financials + web signals); the deterministic core is a prior
// + a floor (it under-estimates without firmographics). Fail-open to deterministic
// when there's no LLM key.
export async function estimateForSubject({ subject, maxFollowers = 0, env = process.env }) {
  const company = subject.company || null;
  const firmo = await freeCompanyFinancials({ company, env });
  const core = computeNetWorth({ title: subject.title, firmo, maxFollowers });

  const web = await webSearch(`${subject.name || company} net worth`, env);
  const llm = await narrate({ subject, firmo, core, web, env });

  // Not an individual (a company/brand slipped through identify) → say so, no number.
  if (llm && llm.is_individual === false) {
    return {
      not_individual: true, band: null, low: null, mid: null, high: null, confidence: 'low',
      display: null, role: 'organization', components: [], valuation: null, disclosed: null,
      rationale: llm.rationale || 'This appears to be a company or brand, not an individual — no personal net worth applies.',
      caveat: llm.caveat || 'Not an individual; enter a specific person (their name, LinkedIn, or personal email).',
      firmographics: null, model: env.PERSON_MODEL || env.OUTREACH_MODEL || 'claude-sonnet-4-6',
    };
  }

  let { low, mid, high, band, confidence } = core;
  let disclosed = null;
  if (llm && Number.isFinite(Number(llm.disclosed_value)) && Number(llm.disclosed_value) > 0) {
    disclosed = { value: Math.round(Number(llm.disclosed_value)), source: llm.disclosed_source || null };
    mid = disclosed.value; low = Math.round(mid * 0.7); high = Math.round(mid * 1.3);
    band = bandFor(mid); confidence = 'high';
  } else if (llm && Number.isFinite(Number(llm.estimate_mid)) && Number(llm.estimate_mid) > 0) {
    // LLM-primary: use its grounded low/mid/high, floored by a solid deterministic
    // founder-equity computation so a real firmographic figure is never undercut.
    let md = Number(llm.estimate_mid);
    let lo = Number(llm.estimate_low) > 0 ? Number(llm.estimate_low) : md * 0.5;
    let hi = Number(llm.estimate_high) > 0 ? Number(llm.estimate_high) : md * 1.6;
    if (lo > md) lo = md * 0.5;
    if (hi < md) hi = md * 1.6;
    if (core.coreLabel === 'founder_equity') { lo = Math.max(lo, core.low); md = Math.max(md, core.mid); hi = Math.max(hi, core.high); }
    low = Math.round(lo); mid = Math.round(md); high = Math.round(hi);
    band = bandFor(mid);
    confidence = ['high', 'medium', 'low'].includes(llm.confidence) ? llm.confidence : core.confidence;
  }

  return {
    band, low, mid, high, confidence,
    display: `${money(low)} – ${money(high)}`,
    role: (llm && llm.driver) ? String(llm.driver).replace(/_/g, ' ') : core.role,
    components: core.components,
    valuation: core.valuation,
    disclosed,
    rationale: (llm && llm.rationale) || defaultRationale(core, company),
    caveat: (llm && llm.caveat) || 'Rough estimate from public and inferred signals — not a verified figure.',
    firmographics: firmo ? {
      company: firmo.company || company || null,
      employees: firmo.employees || null, funding: firmo.funding || null,
      fundingStage: firmo.fundingStage || null, valuation: firmo.valuation || null,
      revenue: firmo.revenue || null, note: firmo.note || null, source: 'web',
    } : (company ? { company, source: 'web', note: 'no public financials found' } : null),
    model: llm ? (env.PERSON_MODEL || env.OUTREACH_MODEL || 'claude-sonnet-4-6') : null,
  };
}

export default { runNetWorth, estimateForSubject, computeNetWorth };
