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
import { getToolLookup, saveToolLookup } from '../db/tools.js';
import { trackerComps, trackerCompsConfigured } from './trackerComps.js';
import { scoreQuality } from './quality.js';
import { scoreBrandability } from './brandability.js';
import { domainRenewal } from './renewal.js';
import { namebioComps, namebioComparables } from './comps.js';

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
// Field names drift across their API (and differ from what the client's digAppraisal
// reads), so cover the WHOLE set the standalone Appraisal tool handles — otherwise we
// get the data but extract no number and wrongly show "no value for this name".
function normalizeAppraise(data) {
  const a = data && data.appraisal ? data.appraisal : data;
  if (!a || typeof a !== 'object') return null;
  const num = (...keys) => { for (const k of keys) { const v = parseMoney(a[k]); if (v) return v; } return null; };
  let low = num('low', 'value_low', 'low_value', 'minValue', 'min', 'min_value', 'valueLow', 'priceLow');
  let high = num('high', 'value_high', 'high_value', 'maxValue', 'max', 'max_value', 'valueHigh', 'priceHigh');
  // A range can live under several keys, as an object ({low/min/from, high/max/to})
  // or a "$a – $b" string.
  for (const k of ['value_range', 'valueRange', 'range', 'priceRange', 'estimatedValue', 'estimated_value']) {
    if (low && high) break;
    const rng = a[k];
    if (!rng) continue;
    if (typeof rng === 'object') {
      low = low || parseMoney(rng.low ?? rng.min ?? rng.from ?? rng.low_value);
      high = high || parseMoney(rng.high ?? rng.max ?? rng.to ?? rng.high_value);
    } else if (typeof rng === 'string') {
      const parts = rng.split(/[-–—]|to/i).map((p) => parseMoney(p)).filter(Boolean);
      if (parts.length >= 2) { low = low || parts[0]; high = high || parts[1]; }
      else if (parts.length === 1) { low = low || parts[0]; }
    }
  }
  const point = num('estimated_value', 'estimatedValue', 'value', 'valuation', 'price', 'fair_market_value', 'fairMarketValue', 'marketValue', 'appraisedValue', 'appraised_value', 'estimate');
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

// Read the trademark_search result (signa.so/USPTO) into a screening-level conflict
// signal for the EXACT term. Field names vary, so parse defensively. A LIVE/registered
// mark whose text == the SLD narrows the realistic buyer pool toward that holder
// (esp. in software/AI classes 9 & 42) → a resale discount. NOT legal clearance.
function normalizeTrademark(data, sld) {
  const list = data && Array.isArray(data.trademarks) ? data.trademarks : [];
  const target = String(sld || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!target || !list.length) return { exact_live: false, tech_class: false, exact_live_count: 0, total: list.length };
  const txt = (it) => String(it.text ?? it.mark ?? it.markText ?? it.wordmark ?? it.name ?? it.keyword ?? it.title ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const statusOf = (it) => String(it.status ?? it.statusType ?? it.legalStatus ?? it.state ?? it.markStatus ?? it.statusDescription ?? '').toLowerCase();
  const live = (s) => !s ? true : (/(live|regist|active|publish|allowed|pending)/.test(s) && !/(dead|abandon|cancel|expir|withdraw|refus)/.test(s));
  const classBlob = (it) => (JSON.stringify(it.classes ?? it.niceClasses ?? it.internationalClasses ?? it.classNumbers ?? it.intlClasses ?? it.class ?? '') + ' ' + String(it.goods ?? it.goodsAndServices ?? it.goods_services ?? it.description ?? '')).toLowerCase();
  let exactLiveCount = 0;
  let techClass = false;
  for (const it of list) {
    if (!it || typeof it !== 'object') continue;
    if (txt(it) === target && live(statusOf(it))) {
      exactLiveCount++;
      const c = classBlob(it);
      if (/(^|[^0-9])(9|42)([^0-9]|$)/.test(c) || /software|artificial intelligence|machine learning|\bai\b|computer|saas|platform|mobile app|downloadable/.test(c)) techClass = true;
    }
  }
  return { exact_live: exactLiveCount > 0, tech_class: techClass, exact_live_count: exactLiveCount, total: list.length };
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

// Word COMMONNESS for the SLD — the corpus stores a wordfreq `zipf_score` per row.
// Look it up by SLD across ANY extension (better coverage than the exact domain),
// so a common word (flora/vision) scores high and an obscure one (alliteration) low.
// Free, fail-open → null when the word isn't in the corpus.
async function universeZipf(sld) {
  if (!isNamingDbConfigured() || !sld) return null;
  try {
    const { data } = await getNamingDb()
      .from('name_universe')
      .select('zipf_score')
      .eq('sld', sld)
      .not('zipf_score', 'is', null)
      .limit(1)
      .maybeSingle();
    return data && data.zipf_score != null ? Number(data.zipf_score) : null;
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

// Run a source, returning { data, note } — note carries the error/limit message
// (e.g. Atom daily cap, Appraise.net Cloudflare challenge) so the UI can show WHY
// a value is missing rather than a bare "no estimate".
async function toolNote(name, args, env) {
  try {
    const r = await runTool(name, args, env);
    return r && r.ok ? { data: r.data, note: null } : { data: null, note: r && r.error ? String(r.error) : null };
  } catch (e) { return { data: null, note: String((e && e.message) || e) }; }
}

// Appraise.net is ASYNC — the first call may return a job to poll, not a value. So
// poll the job to completion (bounded), and cache the result per domain (kind 'ap')
// so re-runs don't re-spend / re-wait. Returns { data, note }.
async function appraiseGather(d, env) {
  try { const row = await getToolLookup('ap', d); if (row && row.data && row.data.appraisal) return { data: row.data, note: null }; } catch { /* cache miss */ }
  // ONE best-effort call — the source polls its async job internally (bounded), so
  // we don't add another poll loop here (that blew the 60s function budget). The
  // outer withTimeout caps our wait; if the job finishes it caches for next time.
  const { data, note } = await toolNote('appraise_lookup', { domain: d }, env);
  if (data && data.appraisal) { try { await saveToolLookup('ap', d, data); } catch { /* best-effort */ } }
  return { data, note };
}

// Atom has a HARD ~10/day cap — cache the value per domain (kind 'at') so re-runs
// never re-spend a quota slot; surface the cap message as a note when exhausted.
async function atomGather(d, env) {
  try { const row = await getToolLookup('at', d); if (row && row.data && row.data.value > 0) return { data: row.data, note: null }; } catch { /* cache miss */ }
  const r = await toolNote('atom_appraise', { domain: d }, env);
  if (r.data && r.data.value > 0) { try { await saveToolLookup('at', d, r.data); } catch { /* best-effort */ } }
  return r;
}

// NameBio exact-domain sales (1 credit) — cache per domain (kind 'nb').
async function nbExactGather(d, env) {
  try { const row = await getToolLookup('nb', d); if (row && row.data) return row.data; } catch { /* cache miss */ }
  const data = await namebioComps(d, env);
  if (data) { try { await saveToolLookup('nb', d, data); } catch { /* best-effort */ } }
  return data;
}

// NameBio Comps engine (flat ~25 credits) — cache per domain (kind 'nbc'); only the
// SUCCESS (comps present) is cached so a rate-limited empty retries later.
async function nbCompsGather(d, env) {
  try { const row = await getToolLookup('nbc', d); if (row && row.data && row.data.comps && row.data.comps.length) return row.data; } catch { /* cache miss */ }
  const data = await namebioComparables(d, env);
  if (data && data.comps && data.comps.length) { try { await saveToolLookup('nbc', d, data); } catch { /* best-effort */ } }
  return data; // may carry a note (e.g. rate limit) when empty
}

export async function gatherSignals(domain, env = process.env) {
  const d = String(domain).toLowerCase();
  const dot = d.indexOf('.');
  const sld = dot > 0 ? d.slice(0, dot) : d;
  const tld = dot > 0 ? d.slice(dot + 1) : '';
  const sldWord = sldOf(d);

  // Dictionary check, the target's own universe row, AND the FREE internal sold
  // comps (Master Txns List) run first — both cheap, and the tracker count decides
  // whether we need to spend on the paid NameBio Comps engine.
  const [wordSet, self, trackerSold, zipf] = await Promise.all([
    sldWord ? filterDictionaryWords([sldWord]) : Promise.resolve(new Set()),
    universeSelf(d),
    trackerCompsConfigured() ? withTimeout(trackerComps({ sld, tld, len: sld.length }, env), 8000, null) : Promise.resolve(null),
    withTimeout(universeZipf(sld), 4000, null),
  ]);
  const isWord = Boolean(sldWord && wordSet.has(sldWord));
  const numWords = self && self.num_words != null ? self.num_words : null;
  const quality = scoreQuality({ sld, tld, isWord, numWords });
  // Brandability — length + ease + word commonness (zipf). The VALUE lever is the
  // commonness component (length/ease already live in the quality grade).
  const brandability = scoreBrandability({ sld, pronounce: quality.components && quality.components.pronounce, zipf });

  // The NameBio Comps engine is a FLAT ~25-credit call (not per-comp). Only spend it
  // when our free internal Master Txns comps are thin — most names already have
  // plenty of internal sold comps, so this avoids the charge entirely.
  const trackerCount = (trackerSold && Array.isArray(trackerSold.deals)) ? trackerSold.deals.length : 0;
  const needNbComps = trackerCount < 6;

  // Everything else in parallel — each fail-open. Appraisals poll-to-completion +
  // cache per domain; the paid NameBio comps are gated + cached.
  const [
    rdapData, liveData, dsData, appraiseRes, atomRes,
    nameproData, webDomain, webTerm,
    nbComps, nbComparables, dealHistory, emailThreads, tmData, renewal,
  ] = await Promise.all([
    tool('rdap_whois', { domain: d }, env),
    tool('livesite_inspect', { domain: d }, env),
    tool('domainscout_lookup', { domain: d }, env),
    withTimeout(appraiseGather(d, env), 9000, { data: null, note: 'still computing' }),
    atomGather(d, env),
    tool('namepros_search', { domain: d }, env),
    tool('web_search', { query: `"${d}"` }, env),
    tool('web_search', { query: sld }, env),
    nbExactGather(d, env),
    needNbComps ? nbCompsGather(d, env) : Promise.resolve(null),
    getDealComps(d),
    emailIngestConfigured() ? withTimeout(searchEmailThreads(d), 8000, []) : Promise.resolve([]),
    withTimeout(tool('trademark_search', { query: sld }, env), 8000, null),
    withTimeout(domainRenewal(d, env), 8000, null),
  ]);

  const appraise = normalizeAppraise(appraiseRes && appraiseRes.data);
  const appraiseNote = (appraiseRes && appraiseRes.note) || null;
  const atomData = atomRes && atomRes.data;
  const atom = atomData && atomData.value > 0
    ? { value: atomData.value, score: atomData.score, positive: atomData.positive_signals || [], negative: atomData.negative_signals || [], tm_conflicts: atomData.tm_conflicts }
    : null;
  const atomNote = (atomRes && atomRes.note) || null;
  const forSale = normalizeForSale(dsData);
  // The domain's own current listing (asking) — distinct from "similar" comps.
  const listing = forSale.listed && forSale.price ? { price: forSale.price, platform: forSale.platform } : null;

  return {
    domain: d,
    sld,
    tld,
    is_word: isWord,
    quality,
    brandability,
    self: self ? { asking: self.best_price || null, asking_source: self.best_price_source || null, quality_score: self.quality_score ?? null, category: self.category || null, keywords: self.keywords || [], industries: self.industries || [] } : null,
    registration: normalizeRegistration(rdapData),
    current_use: liveData || null,
    for_sale: forSale,
    listing,
    appraisals: { appraise, atom, appraise_note: appraiseNote, atom_note: atomNote },
    trademark: normalizeTrademark(tmData, sld),
    renewal: renewal || null,
    comps: { namebio: nbComps, namebio_comps: nbComparables, tracker: trackerSold, deal_history: dealHistory },
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
