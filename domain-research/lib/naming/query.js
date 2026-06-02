import { getNamingDb } from '../db/supabase-naming.js';
import { getMasterlistDb, isMasterlistDbConfigured } from '../db/masterlist.js';

// Run the parsed filters against BOTH corpora (spec §3) and split the results
// into Buy-ready vs Stretch (§3.4):
//   • name_universe        (SUPABASE_NAMING_*)  — the broad automated market
//   • Master Domain List   (MASTERLIST_*)       — curated/owned, ALL for-sale
// Everything in Master is for sale, so it's always included in the naming pool
// (2026-06). The two tables live in different Supabase projects with different
// schemas, so each is queried with its own column mapping and Master rows are
// normalized to the universe row shape before merging.
//
// Hybrid keyword matching (2026-06): we use the LLM enrichment on both corpora.
// A brief's semantic_keywords are matched against the enriched keywords[] /
// industries[] arrays FIRST (true semantic match — surfaces names that are
// *about* a theme even when the word isn't in the domain). Passes are merged by
// priority tier (semantic keyword > semantic industry > general top), and within
// each tier the two corpora are interleaved round-robin so Master is never
// starved by the universe's larger row count, then deduped by domain.
// PASS_LIMIT caps each SQL pass; BUCKET_LIMIT caps the Buy-ready and Stretch
// buckets independently. Both are high enough to "show them all" for a realistic
// filtered brief — the user narrows with the on-screen filters rather than us
// truncating at 100. They're a safety ceiling (payload size / browser render /
// statement-timeout headroom), not a product limit; raise if briefs legitimately
// exceed them. Sorting the top-N by quality_score costs the same regardless of N
// (the match set is sorted either way), so a larger N adds no query-timeout risk.
const PASS_LIMIT = 500;
const BUCKET_LIMIT = 500;

const SELECT_COLS =
  'domain, sld, tld, sld_length, num_words, num_syllables, is_dictionary_word, ' +
  'best_price, best_price_source, sources, quality_score, deal_score, source_tier, ' +
  'category, connotation, keywords, industries';

// Master Domain List columns differ (see api/dbsearch.js buildMaster): domain
// (no sld), price, owner, source (single text), category, tld, sld_length,
// number_of_words, is_single_word / dictionary_word ('Y'/'N' TEXT), and
// keywords/emotions/industries text[] (enriched 2026-06), connotation TEXT.
const MASTER_SELECT_COLS =
  'domain, price, owner, source, category, tld, sld_length, number_of_words, ' +
  'is_single_word, dictionary_word, connotation, keywords, industries, emotions, quality_score';

export async function searchUniverse(filters) {
  const db = getNamingDb();
  const kw = sanitizeKeywords(filters.semantic_keywords);
  // Each corpus runs its passes in priority order: enriched keywords[] overlap
  // (true semantic) > enriched industries[] overlap > the general top pass. All
  // are index-bound (GIN on keywords/industries; quality_score/tld or price
  // b-tree on the general pass), so every brief stays fast.
  //
  // The old SLD-substring fallback (sld ILIKE %term%) was removed: with no
  // narrowing structural filter it scanned the whole .com tail and blew the
  // statement timeout. Theme coverage now comes from enrichment, which keeps
  // growing — reintroduce substring later only via a bounded/indexed path.
  //
  // We keep universe and master passes in the SAME priority tier so the merge
  // can interleave them (round-robin) and Master — every row of which is for
  // sale — is never crowded out by the universe's far larger row count.
  // pricedKeywords/pricedIndustries are buy-ready-focused passes: same GIN
  // keyword/industry overlap, but restricted to priced rows (best_price > 0,
  // within cap). They guarantee priced candidates reach the merge so the
  // Buy-ready bucket isn't crowded out by unpriced premium names that outrank
  // them on quality_score (the cause of the "only 2 buy-ready" starvation).
  const universeTasks = {
    pricedKeywords: null, pricedIndustries: null,
    keywords: null, industries: null,
    general: buildQuery(db, filters, null, null),
  };
  // The non-priced keyword/industry passes have no price filter to narrow them,
  // so a 50-term GIN overlap can match a huge set and the post-GIN ORDER BY
  // quality_score sort blows the statement timeout on heavy briefs. Cap THOSE
  // passes to the strongest terms (parser lists them best-first); the priced
  // passes + the general pass keep the full set, and relevance scoring still
  // uses every keyword. See the idx_universe_quality recommendation in CLAUDE.md.
  const kwBroad = kw.slice(0, 24);
  if (kw.length) {
    universeTasks.pricedKeywords = buildQuery(db, filters, kw, 'keywords', { pricedOnly: true });
    universeTasks.pricedIndustries = buildQuery(db, filters, kw, 'industries', { pricedOnly: true });
    universeTasks.keywords = buildQuery(db, filters, kwBroad, 'keywords');
    universeTasks.industries = buildQuery(db, filters, kwBroad, 'industries');
  }

  // Master is a separate project; include it when configured. Failures are
  // non-fatal (log + continue with universe) so naming never breaks if Master
  // is briefly unreachable or a column is missing — but normally it's in.
  const masterTasks = {
    pricedKeywords: null, pricedIndustries: null,
    keywords: null, industries: null, general: null,
  };
  if (isMasterlistDbConfigured()) {
    const mdb = getMasterlistDb();
    masterTasks.general = buildMasterQuery(mdb, filters, null, null);
    if (kw.length) {
      masterTasks.pricedKeywords = buildMasterQuery(mdb, filters, kw, 'keywords', { pricedOnly: true });
      masterTasks.pricedIndustries = buildMasterQuery(mdb, filters, kw, 'industries', { pricedOnly: true });
      masterTasks.keywords = buildMasterQuery(mdb, filters, kwBroad, 'keywords');
      masterTasks.industries = buildMasterQuery(mdb, filters, kwBroad, 'industries');
    }
  }

  const [uRes, mRes] = await Promise.all([
    resolveCorpus(universeTasks, 'name_universe'),
    resolveCorpus(masterTasks, 'Master Domain List'),
  ]);

  // Per-pass fault tolerance. A single slow pass — e.g. a broad keyword/industry
  // GIN overlap whose ORDER BY quality_score over a huge match set blows the
  // statement timeout — must NOT fail the whole search; we use whatever passes
  // returned (the priced + general passes are cheap and almost always succeed).
  // Only hard-fail when EVERY attempted pass across BOTH corpora errored (a real
  // outage), so a genuine problem still surfaces instead of silent emptiness.
  if (uRes.ok === 0 && mRes.ok === 0 && (uRes.errors.length || mRes.errors.length)) {
    throw new Error(`name_universe query failed: ${uRes.errors[0] || mRes.errors[0]}`);
  }
  const U = uRes.rows;
  const MM = mRes.rows;

  // Build priority-tiered, corpus-interleaved row lists. Within each tier the
  // two corpora alternate so both are represented under the per-bucket cap; tiers
  // concatenate in semantic-priority order. Master rows are normalized to the
  // universe shape on the way in. The merge loop below consumes {data} objects.
  const M = (rows) => (rows || []).map(normalizeMasterRow);
  const responses = [
    { data: interleave(U.pricedKeywords, M(MM.pricedKeywords)) },
    { data: interleave(U.pricedIndustries, M(MM.pricedIndustries)) },
    { data: interleave(U.keywords, M(MM.keywords)) },
    { data: interleave(U.industries, M(MM.industries)) },
    { data: interleave(U.general, M(MM.general)) },
  ];
  // Connotation criterion (UI multi-select) applied in-memory — see buildQuery
  // note. Drop enriched rows whose tone is excluded; unenriched (null) rows pass.
  const allowCon = Array.isArray(filters.connotation) && filters.connotation.length
    ? new Set(filters.connotation) : null;
  const conOk = (row) => !allowCon || !row.connotation || allowCon.has(String(row.connotation));
  // Word-form exclusions (UI multi-select) applied in-memory for the same
  // reason connotation is: a SQL regex/LIKE on the SLD over millions of rows
  // blows the (tld, quality_score) index → statement timeout. Heuristics on the
  // lowercased SLD; a row is dropped if its SLD matches ANY selected form.
  const formTests = {
    plural: (s) => /s$/.test(s) && !/(ss|us|is|as|os)$/.test(s),
    past:   (s) => /ed$/.test(s),
    ing:    (s) => /ing$/.test(s),
    ly:     (s) => /ly$/.test(s),
  };
  const excludeForms = Array.isArray(filters.exclude_forms)
    ? filters.exclude_forms.filter((f) => formTests[f]) : [];
  const formOk = (row) => {
    if (!excludeForms.length) return true;
    const s = String(row.sld || '').toLowerCase();
    return !excludeForms.some((f) => formTests[f](s));
  };
  // Syllable bounds applied in-memory so they cover Master too (which has no
  // num_syllables column — normalizeMasterRow computes it). Universe rows are
  // also SQL-filtered in buildQuery; this is the catch-all. A row with no
  // syllable count is only dropped when a bound is actually set.
  const sylMin = filters.syllables_min;
  const sylMax = filters.syllables_max;
  const sylOk = (row) => {
    if (sylMin == null && sylMax == null) return true;
    const n = row.num_syllables;
    if (n == null) return false;
    if (sylMin != null && n < sylMin) return false;
    if (sylMax != null && n > sylMax) return false;
    return true;
  };
  // Two budgets so the buckets fill independently: priced (Buy-ready candidates)
  // and the rest (Stretch). A single shared cap let unpriced premium names —
  // which dominate the quality_score ordering — consume the whole window and
  // starve Buy-ready. Mirror splitAndShape's notion of "priced & in range".
  const cap = filters.max_price;
  const floor = filters.min_price;
  const isPricedInRange = (row) => {
    const bp = row.best_price != null && Number(row.best_price) > 0 ? Number(row.best_price) : null;
    if (bp == null) return false;
    if (floor != null && bp < floor) return false;
    if (cap != null && bp > cap) return false;
    return true;
  };
  const seen = new Set();
  const priced = [];
  const other = [];
  for (const r of responses) {
    for (const row of r.data || []) {
      if (seen.has(row.domain)) continue;
      if (!conOk(row)) continue;
      if (!formOk(row)) continue;
      if (!sylOk(row)) continue;
      const bucket = isPricedInRange(row) ? priced : other;
      if (bucket.length >= BUCKET_LIMIT) continue;
      seen.add(row.domain);
      bucket.push(row);
    }
    if (priced.length >= BUCKET_LIMIT && other.length >= BUCKET_LIMIT) break;
  }
  const merged = [...priced, ...other];
  // Post-filter: drop SLDs the english_words dictionary flags as inflected
  // (is_root=false) when the chat / brief asked to exclude them. Unknown
  // words pass through — keeps coined/technical names like saas.com.
  const cleaned = filters.exclude_inflected ? await dropInflected(db, merged) : merged;

  return splitAndShape(cleaned, filters);
}

async function dropInflected(db, rows) {
  if (!rows.length) return rows;
  const slds = [...new Set(rows.map((r) => String(r.sld || '').toLowerCase()).filter(Boolean))];
  if (!slds.length) return rows;
  try {
    const { data, error } = await db
      .from('english_words')
      .select('word')
      .in('word', slds)
      .eq('is_root', false);
    if (error) {
      // Table missing or other error — fail-open so the search still works.
      // The chat agent's reply will already have said the filter was applied;
      // log so this gap surfaces, but don't punish the user.
      console.error('exclude_inflected lookup failed:', error.message);
      return rows;
    }
    const inflected = new Set((data || []).map((d) => d.word));
    if (!inflected.size) return rows;
    return rows.filter((r) => !inflected.has(String(r.sld || '').toLowerCase()));
  } catch (e) {
    console.error('exclude_inflected lookup threw:', e && e.message);
    return rows;
  }
}

// name_universe.tld is stored BARE ("com") after the 2026-06 standardization,
// but briefs/UI express TLDs dotted (".com"). Match BOTH forms so the filter
// works regardless of storage convention (mirrors dbsearch's tldVariants).
function tldVariants(tlds) {
  const out = new Set();
  for (const t of tlds || ['.com']) {
    const bare = String(t).replace(/^\./, '').toLowerCase();
    if (bare) { out.add(bare); out.add('.' + bare); }
  }
  return [...out];
}

function buildQuery(db, filters, keywords, matchMode, opts = {}) {
  const pricedOnly = !!opts.pricedOnly;
  let q = db.from('name_universe').select(SELECT_COLS);
  // Empty TLD set = no TLD constraint (all TLDs) — brief stayed silent and the
  // UI dropdown is at "All". Otherwise restrict to the chosen TLDs (bare+dotted).
  const tv = Array.isArray(filters.tlds) && filters.tlds.length ? tldVariants(filters.tlds) : [];
  if (tv.length) q = q.in('tld', tv);
  if (filters.sld_length_min != null) q = q.gte('sld_length', filters.sld_length_min);
  if (filters.sld_length_max != null) q = q.lte('sld_length', filters.sld_length_max);
  if (filters.syllables_min != null) q = q.gte('num_syllables', filters.syllables_min);
  if (filters.syllables_max != null) q = q.lte('num_syllables', filters.syllables_max);
  if (filters.num_words != null) q = q.eq('num_words', filters.num_words);
  if (filters.dictionary_word_only) q = q.eq('is_dictionary_word', true);
  if (filters.min_quality_score != null) q = q.gte('quality_score', filters.min_quality_score);
  if (pricedOnly) {
    // Buy-ready pass: ONLY genuinely-priced rows (best_price > 0). Without this,
    // the candidate window — ordered by quality_score — fills with unpriced
    // premium names, starving the Buy-ready bucket. Pairs with a GIN keyword/
    // industry overlap so the price filter rides a small, indexed result set.
    q = q.gt('best_price', 0);
    if (filters.max_price != null) q = q.lte('best_price', filters.max_price);
    if (filters.min_price != null) q = q.gte('best_price', filters.min_price);
  } else {
    // Per spec §3.2: rows with NULL price still pass the cap and fall into
    // Stretch with "TBD" pricing. Same rule applies to min_price — unpriced
    // rows pass through so they can surface as north-star options.
    if (filters.max_price != null) q = q.or(`best_price.lte.${filters.max_price},best_price.is.null`);
    if (filters.min_price != null) q = q.or(`best_price.gte.${filters.min_price},best_price.is.null`);
  }
  // NOTE: connotation is NOT filtered here. A SQL `connotation IN (...) OR IS
  // NULL` matches nearly every row (most are unenriched/NULL), so it adds no
  // selectivity and defeats the (tld, quality_score) index → statement timeout.
  // The connotation criterion is applied in-memory in searchUniverse() instead.
  // Precise per-domain blocklist. validateFilters() already restricted these
  // to [a-z0-9.-] so the comma-joined PostgREST list is safe.
  if (Array.isArray(filters.exclude_domains) && filters.exclude_domains.length) {
    q = q.not('domain', 'in', `(${filters.exclude_domains.join(',')})`);
  }
  // Keyword pass. `matchMode` picks the matching strategy:
  //   'keywords'   → enriched keywords[] overlaps any brief term (semantic)
  //   'industries' → enriched industries[] overlaps any brief term (semantic)
  //   'sld'        → SLD contains any brief term (substring fallback)
  // overlaps() is a single-column filter so the array literal is built safely
  // by the client (no .or() comma-splitting pitfall); the substring pass keeps
  // the per-keyword .or() since its conditions carry no array literals.
  if (keywords && keywords.length && matchMode) {
    if (matchMode === 'keywords') q = q.overlaps('keywords', keywords);
    else if (matchMode === 'industries') q = q.overlaps('industries', keywords);
    // SLD substring is a trigram scan; a 50-way OR over millions of rows can blow
    // the statement timeout, so cap it to the top terms (the GIN keyword/industry
    // passes already carry the full set for enriched rows).
    else if (matchMode === 'sld') q = q.or(keywords.slice(0, 12).map((k) => `sld.ilike.%${k}%`).join(','));
  }
  // Ranking per the 2026-05-30 decision recorded in §3.2: quality dominates,
  // tier breaks ties at similar quality, deal_score breaks ties below that.
  q = q
    .order('quality_score', { ascending: false, nullsFirst: false })
    .order('source_tier', { ascending: true })
    .order('deal_score', { ascending: false, nullsFirst: false })
    .limit(PASS_LIMIT);
  return q.then((r) => r); // resolve to {data, error}
}

// Master Domain List pass — mirrors buildQuery with Master's column names. Every
// Master row is for sale, so it's always eligible; we apply the same structural
// filters the brief sets (length, word count, dictionary, TLD, price, keyword
// overlap) and order by price desc so premium listings lead within a tier
// (relevance re-sorts later anyway; Master has no quality_score).
function buildMasterQuery(db, filters, keywords, matchMode, opts = {}) {
  const pricedOnly = !!opts.pricedOnly;
  let q = db.from('Master Domain List').select(MASTER_SELECT_COLS);
  const tv = Array.isArray(filters.tlds) && filters.tlds.length ? tldVariants(filters.tlds) : [];
  if (tv.length) {
    q = q.in('tld', tv);
    q = q.not('domain', 'like', '%.%.%'); // clean sld.tld only (exclude ab.co.com)
  }
  if (filters.sld_length_min != null) q = q.gte('sld_length', filters.sld_length_min);
  if (filters.sld_length_max != null) q = q.lte('sld_length', filters.sld_length_max);
  if (filters.num_words != null) q = q.eq('number_of_words', filters.num_words);
  if (filters.dictionary_word_only) q = q.eq('dictionary_word', 'Y');
  // Master has no quality_score column, so min_quality_score can't apply here —
  // including these rows unfiltered errs toward "more names" per product intent.
  if (pricedOnly) {
    q = q.gt('price', 0);
    if (filters.max_price != null) q = q.lte('price', filters.max_price);
    if (filters.min_price != null) q = q.gte('price', filters.min_price);
  } else {
    if (filters.max_price != null) q = q.or(`price.lte.${filters.max_price},price.is.null`);
    if (filters.min_price != null) q = q.or(`price.gte.${filters.min_price},price.is.null`);
  }
  if (Array.isArray(filters.exclude_domains) && filters.exclude_domains.length) {
    q = q.not('domain', 'in', `(${filters.exclude_domains.join(',')})`);
  }
  if (keywords && keywords.length && matchMode) {
    if (matchMode === 'keywords') q = q.overlaps('keywords', keywords);
    else if (matchMode === 'industries') q = q.overlaps('industries', keywords);
  }
  // Rank by quality_score desc (same signal Universe uses), price as the
  // tiebreaker. Master's quality_score is backfilled with the identical
  // wordfreq×tld formula; index idx_master_quality keeps this ordered scan fast.
  // (Pre-backfill, quality_score is NULL → those rows sort last by price.)
  q = q
    .order('quality_score', { ascending: false, nullsFirst: false })
    .order('price', { ascending: false, nullsFirst: false })
    .limit(PASS_LIMIT);
  return q.then((r) => r);
}

// Await a corpus's passes (each a thenable or null) into a per-pass row dict,
// plus { errors, attempted, ok } so the caller can decide. NO pass error is
// fatal here — a single slow/timed-out pass is logged and skipped so the rest of
// the search still returns; the caller hard-fails only if EVERY attempted pass
// errored. This is what keeps a broad keyword-overlap timeout from nuking an
// otherwise-good result set.
async function resolveCorpus(tasks, label) {
  const keys = Object.keys(tasks);
  const rows = {};
  for (const k of keys) rows[k] = [];
  const errors = [];
  let attempted = 0;
  let ok = 0;
  const settled = await Promise.all(keys.map((k) => (tasks[k] ? tasks[k] : Promise.resolve(null))));
  keys.forEach((k, i) => {
    const r = settled[i];
    if (!r) return; // pass not scheduled for this brief
    attempted += 1;
    if (r.error) {
      errors.push(r.error.message || String(r.error));
      console.error(`${label} ${k} pass failed (continuing without it):`, r.error.message);
      return;
    }
    rows[k] = r.data || [];
    ok += 1;
  });
  return { rows, errors, attempted, ok };
}

// Round-robin merge two row arrays so both corpora are represented within a
// priority tier (one from a, one from b, …). Either may be empty.
function interleave(a, b) {
  const out = [];
  const la = Array.isArray(a) ? a : [];
  const lb = Array.isArray(b) ? b : [];
  const n = Math.max(la.length, lb.length);
  for (let i = 0; i < n; i++) {
    if (i < la.length) out.push(la[i]);
    if (i < lb.length) out.push(lb[i]);
  }
  return out;
}

// Vowel-group syllable estimate — mirrors the pipeline's Python count_syllables
// (filters/universe.py) so Master rows (no num_syllables column) can be filtered
// on the same basis as Universe rows that carry the ingest-computed value.
function countSyllables(sld) {
  const s = String(sld || '').toLowerCase();
  if (!s) return 0;
  let count = 0;
  let prevVowel = false;
  for (const c of s) {
    const isV = 'aeiouy'.includes(c);
    if (isV && !prevVowel) count += 1;
    prevVowel = isV;
  }
  if (s.endsWith('e') && count > 1 && !/(le|ee|ye)$/.test(s)) count -= 1;
  return Math.max(1, count);
}

// Project a Master Domain List row into the universe row shape the rest of the
// pipeline (conOk/formOk filters, shapeRow, splitAndShape) expects. Master has
// no `sld` column, so derive it from the domain; no quality_score/deal_score, so
// those are null (relevance ranking handles ordering). dictionary_word is 'Y'/'N'.
function normalizeMasterRow(r) {
  const domain = String(r.domain || '');
  const sld = domain.includes('.') ? domain.slice(0, domain.indexOf('.')) : domain;
  return {
    domain,
    sld,
    tld: r.tld || (domain.includes('.') ? domain.slice(domain.indexOf('.') + 1) : null),
    sld_length: r.sld_length != null ? Number(r.sld_length) : sld.length,
    num_words: r.number_of_words != null ? Number(r.number_of_words) : null,
    num_syllables: countSyllables(sld),
    is_dictionary_word: r.dictionary_word === 'Y',
    best_price: r.price != null ? Number(r.price) : null,
    best_price_source: r.source || null,
    sources: r.source ? [r.source] : [],
    quality_score: r.quality_score != null ? Number(r.quality_score) : null,
    deal_score: null,
    source_tier: null,
    category: r.category || null,
    connotation: r.connotation || null,
    keywords: Array.isArray(r.keywords) ? r.keywords : [],
    industries: Array.isArray(r.industries) ? r.industries : [],
    emotions: Array.isArray(r.emotions) ? r.emotions : [],
    _origin: 'master', // corpus tag → "M" badge in the UI (universe rows have none)
  };
}

// PostgREST .or() takes a comma-separated filter string; commas, parens, or
// percent signs in a value would break parsing. We accept only [a-z0-9] for
// keyword matching — enough for "health", "saas", "b2b", etc.
function sanitizeKeywords(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const k of arr) {
    const cleaned = String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleaned.length >= 2 && cleaned.length <= 24) out.push(cleaned);
  }
  // 50-keyword cap matches the parser system prompt (25-50 enumerated terms).
  // PostgREST handles a 50-clause .or() comfortably (~1.3KB query string).
  return [...new Set(out)].slice(0, 50);
}

function splitAndShape(rows, filters) {
  const kw = Array.isArray(filters.semantic_keywords) ? filters.semantic_keywords : [];
  const shaped = rows.map((r) => shapeRow(r, kw, filters));
  const cap = filters.max_price;
  const floor = filters.min_price;
  const buyReady = [];
  const stretch = [];
  for (const r of shaped) {
    const priced = r.best_price != null;
    // Drop priced rows that fall below the brief's floor — the brief said
    // "between $50K and $150K" means sub-$50K names are out of scope, not
    // Stretch candidates. Unpriced rows still pass to Stretch as "TBD".
    if (priced && floor != null && r.best_price < floor) continue;
    // Buy-ready vs Stretch split per §3.4: priced AND under cap is Buy-ready;
    // unpriced OR over-cap is Stretch. With no cap, every priced row is
    // buy-ready and unpriced rows are still Stretch ("TBD").
    const underCap = cap == null ? true : priced && r.best_price <= cap;
    if (priced && underCap) {
      r.bucket = 'Buy-ready';
      buyReady.push(r);
    } else {
      r.bucket = 'Stretch';
      stretch.push(r);
    }
  }
  // Sort each bucket by relevance (matched-keyword count) first, then
  // quality. Without this, the merged set from the keyword-pass + general-
  // pass query is interleaved by the underlying SQL ORDER BY (quality),
  // which doesn't reflect what the user actually cares about. With this,
  // a healthcare brief surfaces biomedical.com (1 match) ahead of
  // criminal.com (0 matches) within the buy-ready bucket.
  const byRelevance = (a, b) => {
    const dr = (b.relevance || 0) - (a.relevance || 0);
    if (dr !== 0) return dr;
    return (b.quality_score || 0) - (a.quality_score || 0);
  };
  buyReady.sort(byRelevance);
  stretch.sort(byRelevance);
  return { buyReady, stretch };
}

// Project a name_universe row into the 9-column shape §4.1 wants. The Status
// column defaults to "For Sale" until Phase 3 lander validation lands — the
// LLM-generated "why it works" column also stays empty until Phase 3.
function shapeRow(r, keywords, filters) {
  // Treat best_price === 0 as "no public price" — Afternic in particular uses
  // 0 as a make-offer / no-BIN sentinel and the live data shows it flooding
  // results that should have routed to Stretch as TBD.
  const rawPrice = r.best_price == null ? null : Number(r.best_price);
  const best_price = rawPrice != null && rawPrice > 0 ? rawPrice : null;
  const sld = String(r.sld || '').toLowerCase();
  // Relevance explains WHY this candidate surfaced. Hybrid:
  //   semantic — a brief term appears in the row's enriched keywords[]/
  //              industries[] (the name is *about* the theme), OR
  //   substring — a brief term appears literally in the SLD (fallback).
  // Semantic matches count double so on-theme enriched names outrank
  // coincidental substring hits.
  const briefKw = [...new Set(
    (Array.isArray(keywords) ? keywords : []).map((k) => String(k || '').toLowerCase()).filter(Boolean),
  )];
  const enrichSet = new Set(
    [...(Array.isArray(r.keywords) ? r.keywords : []), ...(Array.isArray(r.industries) ? r.industries : [])]
      .map((x) => String(x || '').toLowerCase()).filter(Boolean),
  );
  const matched_semantic = briefKw.filter((k) => enrichSet.has(k));
  const semSet = new Set(matched_semantic);
  const matched_sld = briefKw.filter((k) => sld && sld.includes(k) && !semSet.has(k));
  const matched_keywords = [...matched_semantic, ...matched_sld];
  // Enrichment ranking boosts (filters from the parsed brief). On-category +3;
  // on-tone +1, off-tone -2 (so a negative-connotation name sinks for a warm
  // brief). Unenriched rows (null category/connotation) get no boost — neutral.
  const wantCat = filters && filters.category ? String(filters.category).toLowerCase() : null;
  const wantCon = filters && Array.isArray(filters.connotation) ? new Set(filters.connotation) : null;
  let boost = 0;
  if (wantCat && r.category && String(r.category).toLowerCase() === wantCat) boost += 3;
  if (wantCon && wantCon.size && r.connotation) boost += wantCon.has(String(r.connotation)) ? 1 : -2;
  return {
    domain: r.domain,
    sld: r.sld,
    tld: r.tld,
    best_price,
    best_price_source: r.best_price_source || null,
    sources: Array.isArray(r.sources) ? r.sources : [],
    quality_score: r.quality_score == null ? null : Number(r.quality_score),
    deal_score: r.deal_score == null ? null : Number(r.deal_score),
    source_tier: r.source_tier == null ? null : Number(r.source_tier),
    num_words: r.num_words,
    num_syllables: r.num_syllables,
    category: r.category || null,
    connotation: r.connotation || null,
    keywords: Array.isArray(r.keywords) ? r.keywords : [],
    industries: Array.isArray(r.industries) ? r.industries : [],
    source_label: deriveSourceLabel(r),
    status: 'For Sale',
    landing_url: deriveLandingUrl(r),
    matched_keywords,
    relevance: matched_semantic.length * 2 + matched_sld.length + boost,
    // Which corpus this came from — "M" = Master Domain List, "U" = name_universe.
    origin: r._origin === 'master' ? 'M' : 'U',
  };
}

// §4.2 source-column formatting. Tier-1 sheets get a friendly Snagged/Rob
// label; everything else falls back to the marketplace name. Unpriced rows
// (Stretch) often have a null best_price_source, so we fall back to the
// first entry in sources[] before giving up — keeps "Afternic"/"Atom"/etc.
// visible instead of an unhelpful "Unknown".
function deriveSourceLabel(r) {
  const sources = Array.isArray(r.sources) ? r.sources : [];
  if (sources.includes('snagged_snap_sheet')) return 'Snagged (SNAP)';
  if (sources.includes('snagged_marketplace_sheet')) return 'Snagged (Marketplace)';
  if (sources.includes('rob_purchases_sheet')) return 'Rob Schutz';
  const raw = r.best_price_source || sources[0] || '';
  const src = String(raw).replace(/_(sheet|dump|daily|bin)$/i, '').replace(/_/g, ' ').trim();
  if (!src) return 'Unknown';
  return src.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Best-effort lander URL per §4.1 column 9. Marketplace-specific deep links
// route the user straight to the buy/listing page rather than the domain's
// generic lander (which is often just a marketplace banner or parked page).
// Unknown sources fall back to https://<domain> since portfolio/Efty rows
// generally resolve to their own seller-branded lander there.
//
// Add a new source here when you confirm its listing URL pattern. The key is
// the raw `best_price_source` value (lowercase, matches the universe rows).
const MARKETPLACE_LANDING_URL = {
  afternic:        (d) => `https://www.afternic.com/domain/${d}`,
  atom:            (d) => `https://atom.com/name/${d}`,
  atom_daily:      (d) => `https://atom.com/name/${d}`,
  sedo:            (d) => `https://sedo.com/search/details/?domain=${d}&language=us`,
  dan:             (d) => `https://dan.com/buy-domain/${d}`,
  // Efty seller storefronts route their buy flow through the domain itself
  // (efty.com/<domain> 301s to the seller's lander), so the deep link is stable.
  efty:            (d) => `https://efty.com/${d}`,
  brandbucket:     (d) => `https://www.brandbucket.com/names/${String(d).split('.')[0]}`,
  squadhelp:       (d) => `https://www.squadhelp.com/name/${String(d).split('.')[0]}`,
  spaceship:       (d) => `https://www.spaceship.com/domain/${d}/`,
  namecheap:       (d) => `https://www.namecheap.com/domains/registration/results/?domain=${d}`,
  namecheap_bin:   (d) => `https://www.namecheap.com/domains/registration/results/?domain=${d}`,
  dynadot:         (d) => `https://www.dynadot.com/market/?domain=${d}`,
  dynadot_dump:    (d) => `https://www.dynadot.com/market/?domain=${d}`,
  godaddy:         (d) => `https://www.godaddy.com/domain-search/find?domainToCheck=${d}`,
  // Snagged-owned rows route to the internal listing/contact page on
  // research.snagged.com rather than the public domain.
  snagged_snap_sheet:         (d) => `https://snagged.com/${d}`,
  snagged_marketplace_sheet:  (d) => `https://snagged.com/${d}`,
};

function deriveLandingUrl(r) {
  if (!r.domain) return null;
  // Prefer a marketplace PURCHASE url over the domain's own (usually parked)
  // lander. Check best_price_source first — that's where the priced listing
  // actually lives — then every entry in sources[]; first known marketplace
  // wins. Only when NONE of the sources is a mapped marketplace do we fall back
  // to https://<domain> (Efty Partner, portfolio rows, Rob's purchases, etc.,
  // which generally resolve to a seller-branded lander, so still useful).
  const candidates = [r.best_price_source, ...(Array.isArray(r.sources) ? r.sources : [])];
  for (const c of candidates) {
    const raw = String(c || '').toLowerCase().trim();
    if (!raw) continue;
    const builder = MARKETPLACE_LANDING_URL[raw];
    if (builder) return builder(r.domain);
  }
  return `https://${r.domain}`;
}
