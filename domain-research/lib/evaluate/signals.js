// Signal gathering for the purchase evaluator — runs EVERYTHING we can learn
// about a domain, in parallel, each source best-effort + fail-open so one slow or
// unconfigured source never sinks the eval. This is deliberately comprehensive:
//   • quality        — SLD/TLD craft (scoreQuality + dictionary check)
//   • registration   — age / registrar (RDAP) — established vs freshly-dropped
//   • current_use    — the live site: real business? parked? who's using it now
//   • for_sale       — authoritative listing state + asking price (DomainScout)
//   • appraisals      — Appraise.net + Atom estimates (normalized to numbers)
//   • comps          — NameBio exact sales + internal asking comps + Snagged deals
//   • namepros       — domain-investor forum chatter (WTS/WTB/sold + handles)
//   • web            — straight Google of the exact domain, the SLD term, and the
//                      combo (who's using the term / news / competition)
//   • email_sweep    — has anyone EMAILED us about this domain (Snagged Gmail)
// The buyer/competitor read lives in buyers.js; this module assembles the rest.

import { runTool } from '../sources/index.js';
import { sldOf, filterDictionaryWords } from '../db/dictionary.js';
import { getNamingDb, isNamingDbConfigured } from '../db/supabase-naming.js';
import { searchEmailThreads, emailIngestConfigured } from '../email/threads.js';
import { getDealComps } from '../db/dealComps.js';
import { scoreQuality } from './quality.js';
import { namebioComps, internalComps } from './comps.js';

// "$1,234" / "1.2k" / "$1.3M" / "1,300 USD" → 1234 / 1200 / 1300000 / 1300.
export function parseMoney(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
  const s = String(v).replace(/[, ]/g, '').toLowerCase();
  const m = s.match(/\$?([\d.]+)\s*([km])?/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  if (m[2] === 'k') n *= 1e3;
  else if (m[2] === 'm') n *= 1e6;
  return n > 0 ? n : null;
}

// Pull a {low, mid, high} from Appraise.net's loosely-shaped appraisal object.
function normalizeAppraise(data) {
  const a = data && data.appraisal ? data.appraisal : data;
  if (!a || typeof a !== 'object') return null;
  let low = parseMoney(a.low ?? a.value_low ?? a.minValue ?? a.min);
  let high = parseMoney(a.high ?? a.value_high ?? a.maxValue ?? a.max);
  // value_range / valueRange / range can be a "$a - $b" string or {low,high}.
  const rng = a.value_range ?? a.valueRange ?? a.range;
  if ((!low || !high) && rng) {
    if (typeof rng === 'object') { low = low || parseMoney(rng.low ?? rng.min); high = high || parseMoney(rng.high ?? rng.max); }
    else if (typeof rng === 'string') {
      const parts = rng.split(/[-–—to]+/i).map((p) => parseMoney(p)).filter(Boolean);
      if (parts.length >= 2) { low = low || parts[0]; high = high || parts[1]; }
      else if (parts.length === 1) { low = low || parts[0]; }
    }
  }
  const point = parseMoney(a.estimated_value ?? a.estimatedValue ?? a.value ?? a.fair_market_value ?? a.fairMarketValue ?? a.appraisedValue ?? a.appraised_value);
  const mid = point || (low && high ? (low + high) / 2 : low || high);
  if (!mid) return null;
  return { low: low || mid * 0.6, mid, high: high || mid * 1.8, confidence: a.confidence ?? null };
}

// Best-effort creation date + registrar from an RDAP result (shapes vary by TLD).
function normalizeRegistration(data) {
  if (!data || typeof data !== 'object') return null;
  const flat = JSON.stringify(data);
  // First ISO-ish date we can find under a registration-ish key.
  const created = data.created || data.creation_date || data.registered || data.registration_date
    || (Array.isArray(data.events) && (data.events.find((e) => /regist/i.test(e.action || e.eventAction || ''))?.date
      || data.events.find((e) => /regist/i.test(e.action || e.eventAction || ''))?.eventDate))
    || (flat.match(/"(?:registration|creation|created)[^"]*"\s*:\s*"([0-9]{4}-[0-9]{2}-[0-9]{2}[^"]*)"/i) || [])[1]
    || null;
  let ageYears = null;
  if (created) {
    const t = Date.parse(created);
    if (Number.isFinite(t)) ageYears = Math.max(0, Math.round((Date.now() - t) / (365.25 * 864e5) * 10) / 10);
  }
  return {
    created: created || null,
    age_years: ageYears,
    registrar: data.registrar || data.registrar_name || (data.registrar && data.registrar.name) || null,
    status: Array.isArray(data.status) ? data.status : (data.status ? [data.status] : []),
  };
}

function normalizeForSale(ds) {
  if (!ds) return { listed: false, marketplaces: [] };
  const mkts = Array.isArray(ds.marketplaces) ? ds.marketplaces : [];
  const listed = mkts.filter((m) => m.listed && m.price > 0).sort((a, b) => a.price - b.price);
  const lowest = listed[0] || null;
  return {
    listed: Boolean(ds.for_sale || listed.length),
    price: lowest ? lowest.price : null,
    platform: lowest ? lowest.name : null,
    marketplaces: mkts,
  };
}

// Look up the target's OWN row in name_universe (asking price, word count, quality,
// keywords) — free, fail-open. Helps comps (word-count match) + buyer angles.
async function universeSelf(domain) {
  if (!isNamingDbConfigured()) return null;
  try {
    const { data } = await getNamingDb()
      .from('name_universe')
      .select('domain, sld_length, num_words, is_dictionary_word, best_price, best_price_source, quality_score, category, keywords, industries')
      .eq('domain', domain)
      .maybeSingle();
    return data || null;
  } catch { return null; }
}

// Run one source via runTool, returning its .data or null (never throws).
async function tool(name, args, env) {
  try {
    const r = await runTool(name, args, env);
    return r && r.ok ? r.data : null;
  } catch { return null; }
}

// Cap a slow best-effort promise so it can't stretch the whole (cache-first) eval
// past the function timeout — resolves to `fallback` if it overruns.
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function gatherSignals(domain, env = process.env) {
  const d = String(domain).toLowerCase();
  const dot = d.indexOf('.');
  const sld = dot > 0 ? d.slice(0, dot) : d;
  const tld = dot > 0 ? d.slice(dot + 1) : '';
  const sldWord = sldOf(d);

  // Dictionary check + the target's own universe row run first (both cheap) so we
  // can shape the comp query (word-count / dictionary like-for-like).
  const [wordSet, self] = await Promise.all([
    sldWord ? filterDictionaryWords([sldWord]) : Promise.resolve(new Set()),
    universeSelf(d),
  ]);
  const isWord = Boolean(sldWord && wordSet.has(sldWord));
  const numWords = self && self.num_words != null ? self.num_words : null;
  const quality = scoreQuality({ sld, tld, isWord, numWords });

  // Everything else in parallel — each fail-open.
  const [
    rdapData, liveData, dsData, appraiseData, atomData,
    nameproData, webDomain, webTerm,
    nbComps, intComps, dealHistory, emailThreads,
  ] = await Promise.all([
    tool('rdap_whois', { domain: d }, env),
    tool('livesite_inspect', { domain: d }, env),
    tool('domainscout_lookup', { domain: d }, env),
    tool('appraise_lookup', { domain: d }, env),
    tool('atom_appraise', { domain: d }, env),
    tool('namepros_search', { domain: d }, env),
    tool('web_search', { query: `"${d}"` }, env),
    tool('web_search', { query: sld }, env),
    namebioComps(d, env),
    internalComps({ tld, len: sld.length, numWords, isWord }, env),
    getDealComps(d),
    emailIngestConfigured() ? withTimeout(searchEmailThreads(d), 12000, []) : Promise.resolve([]),
  ]);

  const appraise = normalizeAppraise(appraiseData);
  const atom = atomData && atomData.value > 0
    ? { value: atomData.value, score: atomData.score, positive: atomData.positive_signals || [], negative: atomData.negative_signals || [], tm_conflicts: atomData.tm_conflicts }
    : null;
  const forSale = normalizeForSale(dsData);
  // The domain's own current listing (asking) — distinct from "similar" comps.
  const listing = forSale.listed && forSale.price ? { price: forSale.price, platform: forSale.platform } : null;

  return {
    domain: d,
    sld,
    tld,
    is_word: isWord,
    quality,
    self: self ? { asking: self.best_price || null, asking_source: self.best_price_source || null, quality_score: self.quality_score ?? null, category: self.category || null, keywords: self.keywords || [], industries: self.industries || [] } : null,
    registration: normalizeRegistration(rdapData),
    current_use: liveData || null,
    for_sale: forSale,
    listing,
    appraisals: { appraise, atom },
    comps: { namebio: nbComps, internal: intComps, deal_history: dealHistory },
    namepros: nameproData && Array.isArray(nameproData.results) ? nameproData.results.slice(0, 8) : [],
    web: {
      domain_search: webDomain && Array.isArray(webDomain.results) ? webDomain.results.slice(0, 8) : [],
      domain_knowledge: webDomain && webDomain.knowledge_graph ? webDomain.knowledge_graph : null,
      term_search: webTerm && Array.isArray(webTerm.results) ? webTerm.results.slice(0, 8) : [],
      term_knowledge: webTerm && webTerm.knowledge_graph ? webTerm.knowledge_graph : null,
    },
    email_sweep: Array.isArray(emailThreads) ? emailThreads.slice(0, 12).map((t) => ({
      subject: t.subject || null, snippet: t.snippet || null, mailbox: t.mailbox || null, thread_id: t.thread_id || t.id || null, date: t.date || null,
    })) : [],
  };
}

export default { gatherSignals, parseMoney };
