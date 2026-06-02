import { getNamingDb } from '../db/supabase-naming.js';

// Run the parsed filters against name_universe (spec §3) and split the
// results into Buy-ready vs Stretch (§3.4).
//
// Hybrid keyword matching (2026-06): we now use the LLM enrichment on
// name_universe. A brief's semantic_keywords are matched against the enriched
// keywords[] / industries[] arrays FIRST (true semantic match — surfaces names
// that are *about* a theme even when the word isn't in the domain), and fall
// back to SLD substring matching for rows that aren't enriched yet. The three
// passes are merged by priority (semantic keyword > semantic industry >
// substring) and deduped, so coverage degrades gracefully as enrichment grows.
const ROW_LIMIT = 100;

const SELECT_COLS =
  'domain, sld, tld, sld_length, num_words, num_syllables, is_dictionary_word, ' +
  'best_price, best_price_source, sources, quality_score, deal_score, source_tier, ' +
  'category, connotation, keywords, industries';

export async function searchUniverse(filters) {
  const db = getNamingDb();
  // Two queries when the brief carries semantic_keywords:
  //   A) hard filters + SLD ILIKE any keyword     → relevance-ranked top
  //   B) hard filters only                        → universe-top
  // Merge A first, then B, dedup by domain. The substring approach is
  // approximate (false positives on `med` → `media.com` etc.) but it costs
  // nothing and brings real relevance until Phase 2 enrichment lands.
  const kw = sanitizeKeywords(filters.semantic_keywords);
  // Passes in priority order (merged first-wins): enriched keywords[] overlap
  // (true semantic), enriched industries[] overlap, then SLD-substring fallback
  // for not-yet-enriched rows, then the general top-of-universe pass.
  const tasks = [buildQuery(db, filters, null, null)];
  if (kw.length) {
    tasks.unshift(buildQuery(db, filters, kw, 'sld'));
    tasks.unshift(buildQuery(db, filters, kw, 'industries'));
    tasks.unshift(buildQuery(db, filters, kw, 'keywords'));
  }
  const responses = await Promise.all(tasks);
  for (const r of responses) {
    if (r.error) throw new Error(`name_universe query failed: ${r.error.message}`);
  }
  const seen = new Set();
  const merged = [];
  for (const r of responses) {
    for (const row of r.data || []) {
      if (seen.has(row.domain)) continue;
      seen.add(row.domain);
      merged.push(row);
      if (merged.length >= ROW_LIMIT) break;
    }
    if (merged.length >= ROW_LIMIT) break;
  }
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

function buildQuery(db, filters, keywords, matchMode) {
  let q = db.from('name_universe').select(SELECT_COLS).in('tld', filters.tlds);
  if (filters.sld_length_min != null) q = q.gte('sld_length', filters.sld_length_min);
  if (filters.sld_length_max != null) q = q.lte('sld_length', filters.sld_length_max);
  if (filters.num_words != null) q = q.eq('num_words', filters.num_words);
  if (filters.dictionary_word_only) q = q.eq('is_dictionary_word', true);
  if (filters.min_quality_score != null) q = q.gte('quality_score', filters.min_quality_score);
  // Per spec §3.2: rows with NULL price still pass the cap and fall into
  // Stretch with "TBD" pricing. Same rule applies to min_price — unpriced
  // rows pass through so they can surface as north-star options.
  if (filters.max_price != null) q = q.or(`best_price.lte.${filters.max_price},best_price.is.null`);
  if (filters.min_price != null) q = q.or(`best_price.gte.${filters.min_price},best_price.is.null`);
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
    else if (matchMode === 'sld') q = q.or(keywords.map((k) => `sld.ilike.%${k}%`).join(','));
  }
  // Ranking per the 2026-05-30 decision recorded in §3.2: quality dominates,
  // tier breaks ties at similar quality, deal_score breaks ties below that.
  q = q
    .order('quality_score', { ascending: false, nullsFirst: false })
    .order('source_tier', { ascending: true })
    .order('deal_score', { ascending: false, nullsFirst: false })
    .limit(ROW_LIMIT);
  return q.then((r) => r); // resolve to {data, error}
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
  const shaped = rows.map((r) => shapeRow(r, kw));
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
function shapeRow(r, keywords) {
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
    relevance: matched_semantic.length * 2 + matched_sld.length,
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
  // Best-price source decides which marketplace URL to use — that's where the
  // priced listing actually lives. If the source isn't mapped (Efty Partner,
  // Braden Pollack Portfolio, Rob's purchases, etc.) we fall back to the
  // domain itself — usually a seller-branded lander, so still useful.
  const raw = String(r.best_price_source || (Array.isArray(r.sources) ? r.sources[0] : '') || '').toLowerCase().trim();
  const builder = MARKETPLACE_LANDING_URL[raw];
  if (builder) return builder(r.domain);
  return `https://${r.domain}`;
}
