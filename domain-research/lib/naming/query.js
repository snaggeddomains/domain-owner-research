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

export async function searchUniverse(filters) {
  const db = getNamingDb();
  let q = db
    .from('name_universe')
    .select(
      'domain, sld, tld, sld_length, num_words, num_syllables, is_dictionary_word, ' +
        'best_price, best_price_source, sources, quality_score, deal_score, source_tier',
    )
    .in('tld', filters.tlds);

  if (filters.sld_length_min != null) q = q.gte('sld_length', filters.sld_length_min);
  if (filters.sld_length_max != null) q = q.lte('sld_length', filters.sld_length_max);
  if (filters.num_words != null) q = q.eq('num_words', filters.num_words);
  if (filters.dictionary_word_only) q = q.eq('is_dictionary_word', true);
  if (filters.min_quality_score != null) q = q.gte('quality_score', filters.min_quality_score);
  // Per spec §3.2: rows with NULL price still pass the price cap — they fall
  // into Stretch with "TBD" pricing, surfaced as north-star options.
  if (filters.max_price != null) q = q.or(`best_price.lte.${filters.max_price},best_price.is.null`);

  // Ranking per the 2026-05-30 decision recorded in §3.2: quality dominates,
  // tier breaks ties at similar quality, deal_score breaks ties below that.
  q = q
    .order('quality_score', { ascending: false, nullsFirst: false })
    .order('source_tier', { ascending: true })
    .order('deal_score', { ascending: false, nullsFirst: false })
    .limit(ROW_LIMIT);

  const { data, error } = await q;
  if (error) throw new Error(`name_universe query failed: ${error.message}`);
  return splitAndShape(data || [], filters);
}

function splitAndShape(rows, filters) {
  const shaped = rows.map((r) => shapeRow(r));
  const cap = filters.max_price;
  // Buy-ready vs Stretch split per §3.4: priced AND under cap is Buy-ready;
  // unpriced OR over-cap is Stretch. With no cap, every priced row is buy-
  // ready and unpriced rows are still Stretch ("TBD").
  const buyReady = [];
  const stretch = [];
  for (const r of shaped) {
    const priced = r.best_price != null;
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
  return {
    domain: r.domain,
    sld: r.sld,
    tld: r.tld,
    best_price: r.best_price == null ? null : Number(r.best_price),
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
// label; everything else falls back to the marketplace name from
// best_price_source. Owner-name detail ("Snagged (Dan Adamson)") is Phase 2.
function deriveSourceLabel(r) {
  const sources = Array.isArray(r.sources) ? r.sources : [];
  if (sources.includes('snagged_snap_sheet')) return 'Snagged (SNAP)';
  if (sources.includes('snagged_marketplace_sheet')) return 'Snagged (Marketplace)';
  if (sources.includes('rob_purchases_sheet')) return 'Rob Schutz';
  const src = String(r.best_price_source || '').replace(/_/g, ' ').trim();
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
