import { getNamingDb } from '../db/supabase-naming.js';

// Run the parsed filters against name_universe (spec §3) and split the
// results into Buy-ready vs Stretch (§3.4).
//
// v1 scope note: this query hits name_universe only and skips the
// master_domain_list LEFT JOIN that §3.2/§3.3 describes. The join is needed
// for keyword-based semantic filtering; for v1 we accept semantic_keywords
// (and surface them back in the parsed-filters bar) but don't apply them as
// a WHERE clause — most rows aren't in master_domain_list anyway, and §3.3
// itself flags the join as "best-effort, approximate" pending Phase 2's
// enrichment of name_universe.keywords. Folding the JOIN in is a small
// follow-up once the enriched column exists.
const ROW_LIMIT = 100;

const SELECT_COLS =
  'domain, sld, tld, sld_length, num_words, num_syllables, is_dictionary_word, ' +
  'best_price, best_price_source, sources, quality_score, deal_score, source_tier';

export async function searchUniverse(filters) {
  const db = getNamingDb();
  // Two queries when the brief carries semantic_keywords:
  //   A) hard filters + SLD ILIKE any keyword     → relevance-ranked top
  //   B) hard filters only                        → universe-top
  // Merge A first, then B, dedup by domain. The substring approach is
  // approximate (false positives on `med` → `media.com` etc.) but it costs
  // nothing and brings real relevance until Phase 2 enrichment lands.
  const kw = sanitizeKeywords(filters.semantic_keywords);
  const tasks = [buildQuery(db, filters, null)];
  if (kw.length) tasks.unshift(buildQuery(db, filters, kw));
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
  return splitAndShape(merged, filters);
}

function buildQuery(db, filters, keywords) {
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
  // Keyword pass: restrict the SLD to substring matches against any keyword.
  if (keywords && keywords.length) {
    const orClause = keywords.map((k) => `sld.ilike.%${k}%`).join(',');
    q = q.or(orClause);
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
  return [...new Set(out)].slice(0, 12);
}

function splitAndShape(rows, filters) {
  const shaped = rows.map((r) => shapeRow(r));
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
  return { buyReady, stretch };
}

// Project a name_universe row into the 9-column shape §4.1 wants. The Status
// column defaults to "For Sale" until Phase 3 lander validation lands — the
// LLM-generated "why it works" column also stays empty until Phase 3.
function shapeRow(r) {
  // Treat best_price === 0 as "no public price" — Afternic in particular uses
  // 0 as a make-offer / no-BIN sentinel and the live data shows it flooding
  // results that should have routed to Stretch as TBD.
  const rawPrice = r.best_price == null ? null : Number(r.best_price);
  const best_price = rawPrice != null && rawPrice > 0 ? rawPrice : null;
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
    source_label: deriveSourceLabel(r),
    status: 'For Sale',
    landing_url: deriveLandingUrl(r),
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

// Best-effort lander URL per §4.1 column 9. Marketplace deep-links would
// need per-source URL builders; for v1 we fall back to https://<domain>
// since that's the universal lander for marketplaces parking the name.
function deriveLandingUrl(r) {
  if (!r.domain) return null;
  return `https://${r.domain}`;
}
