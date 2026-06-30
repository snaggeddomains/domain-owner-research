// Deterministic valuation + price-band model. Turns the gathered comps + quality
// into (a) a fair RESALE value range and (b) the five purchase bands the product
// is built around: immediate buy → decent → neutral → would avoid → bad.
//
// Philosophy: this is an INVESTMENT/RESALE lens. "Fair value" = what the name can
// realistically RESELL for (realizable, not asking). You make money buying BELOW
// that, so the bands are pegged as fractions of realizable value — a fair-value
// purchase is only "neutral" (no flip margin), and you need a discount to reach
// "decent" or "immediate buy". Every number is attributable to a named anchor so
// the verdict can show its work; the LLM layer adjusts within these bounds.

// Buy price as a fraction of estimated realizable RESALE value (fairMid), pegged to
// Snagged's investment return posture: a resale flip is illiquid and slow, so you
// only buy at a big margin. Target return = resale ÷ buy price:
//   ≥12x (≤0.08) immediate buy · ~8x (≤0.13) decent · ~5x (≤0.20) neutral/borderline
//   (5x is "almost certainly a no" unless dramatically underpriced + liquid) ·
//   ~2.5x (≤0.40) would avoid · <2.5x (>0.40) bad. Tunable knobs — the whole
// product's risk appetite lives here.
const BANDS = [
  { key: 'immediate_buy', label: 'Immediate buy', max: 0.08, color: '#0b8f3a' }, // ≥~12x return
  { key: 'decent_buy', label: 'Decent buy', max: 0.13, color: '#5bbf3a' },       // ~8x
  { key: 'neutral', label: 'Neutral / fair', max: 0.20, color: '#caa024' },      // ~5x (borderline no)
  { key: 'would_avoid', label: 'Would avoid', max: 0.40, color: '#e07b2c' },      // ~2.5x
  { key: 'bad_purchase', label: 'Bad purchase', max: Infinity, color: '#cf3030' },
];

// Round to ~2 significant figures so displayed prices read like real ask prices.
export function niceRound(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / mag) * mag;
}

function median(nums) {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// Age (in years) of the most-recent dated sale in a list, or null if undated.
function newestSaleYears(sales) {
  let newest = null;
  for (const s of sales) {
    const t = s && s.date ? Date.parse(s.date) : NaN;
    if (Number.isFinite(t)) {
      const yrs = (Date.now() - t) / (365.25 * 864e5);
      if (newest == null || yrs < newest) newest = yrs;
    }
  }
  return newest;
}

// Quality-only baseline value when comps are thin/absent. An exponential curve
// over the SLD craft score, scaled by the extension's price multiplier. Calibrated
// so a clean one-word .com (~score 90) ≈ $9k, mid (~70) ≈ $2k, weak (~50) ≈ $550.
function qualityBaseline(quality) {
  const sld = quality && quality.sld_score != null ? quality.sld_score : (quality && quality.score) || 40;
  const mult = (quality && quality.tld && quality.tld.mult) || 0.1;
  const mid = Math.pow(10, 0.03 * sld + 1.25) * mult;
  return { low: mid * 0.4, mid, high: mid * 2.4 };
}

// Build the weighted value anchors from each evidence source. Each anchor is
// {source, low, mid, high, weight, note}. Asking prices (the domain's own listing,
// internal "similar asking" comps, AI appraisals) are DISCOUNTED to realizable —
// asks run well above what names actually clear at.
export function buildAnchors({ quality, namebio, namebioComps, tracker, dealOffers, appraise, atom, listing, activeUse = false } = {}) {
  const anchors = [];

  // Position THIS name within a comparable-sales distribution by its quality: a
  // grade-A name sells near the TOP of comparable sales, a weak one near the bottom.
  // (This is the calibration that stops a strong one-word name from being dragged to
  // the median of a broad same-TLD band.) Returns {low, mid, high} from the prices.
  // We INTERPOLATE between sorted prices (not nearest-index) so a top-tier name in a
  // small, lumpy comp set can reach toward the top comp instead of snapping to a
  // single point below a big gap.
  const qScore = Math.max(0, Math.min(100, (quality && quality.score != null) ? quality.score : 50));
  const positioned = (prices, discount) => {
    let sorted = prices.filter((p) => p > 0).sort((a, b) => a - b);
    if (!sorted.length) return null;
    // Trim outliers — drop ~10% off each end (a lone $2K drop-sale or a freak $299K
    // shouldn't swing the estimate). QUALITY-AWARE: a grade-A name's TOP comp is
    // SIGNAL (it belongs up there), so for premium names we keep the top and only
    // trim the cheap bottom; weaker names get a symmetric trim. Keeps a core of ≥3.
    const tBase = Math.min(
      Math.floor(sorted.length * 0.1) || (sorted.length >= 6 ? 1 : 0),
      Math.floor((sorted.length - 3) / 2),
    );
    const tTop = qScore >= 80 ? 0 : tBase;
    if (tBase > 0 || tTop > 0) sorted = sorted.slice(tBase, sorted.length - tTop);
    const at = (f) => {
      const ff = Math.max(0, Math.min(1, f));
      const pos = ff * (sorted.length - 1);
      const lo = Math.floor(pos);
      const hi = Math.ceil(pos);
      return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
    };
    // grade A(85)→~p86, A+(92)→~p94, B(70)→~p68, C(50)→~p45, F(20)→~p9.
    const pct = Math.max(0.10, Math.min(0.96, (qScore - 12) / 85));
    return { low: at(pct - 0.22) * discount, mid: at(pct) * discount, high: at(Math.min(0.99, pct + 0.14)) * discount, midPct: pct };
  };

  // 1a. NameBio COMPARABLE sales — recorded RETAIL sales of SIMILAR names. Real
  // clearing prices; positioned by quality, lightly discounted (broader market).
  const nbComps = (namebioComps && Array.isArray(namebioComps.comps) ? namebioComps.comps : []).filter((c) => c && c.price > 0);
  if (nbComps.length) {
    const p = positioned(nbComps.map((c) => c.price), 0.9);
    if (p) anchors.push({
      source: 'namebio_comps', low: p.low, mid: p.mid, high: p.high, weight: 1.3,
      note: `${nbComps.length} comparable NameBio sale${nbComps.length > 1 ? 's' : ''} of similar names; this name positioned at the ${Math.round(p.midPct * 100)}th pct → $${niceRound(p.mid).toLocaleString()}.`,
    });
  }

  // 1b. Snagged transaction comps — REAL prices comparable names changed hands at
  // (the Master Txns List). Verified realized sales, so only a light haircut; the
  // exact word on another TLD (same_sld) counts double in the distribution.
  const trackerDeals = (tracker && Array.isArray(tracker.deals) ? tracker.deals : []).filter((t) => t && t.price > 0);
  if (trackerDeals.length) {
    const prices = [];
    for (const t of trackerDeals) { prices.push(t.price); if (t.relation === 'same_sld') prices.push(t.price); }
    const p = positioned(prices, 0.95);
    if (p) anchors.push({
      source: 'snagged_transactions', low: p.low, mid: p.mid, high: p.high, weight: 3.4,
      note: `${trackerDeals.length} comparable Snagged transaction${trackerDeals.length > 1 ? 's' : ''}; this name positioned at the ${Math.round(p.midPct * 100)}th pct → $${niceRound(p.mid).toLocaleString()}.`,
    });
  }

  // Strategic comp reference (weighted mid of the comparable-sales anchors) — used
  // to judge whether an old exact-domain sale is stale relative to where similar
  // names clear today.
  const compAnchors = anchors.filter((a) => a.source === 'namebio_comps' || a.source === 'snagged_transactions');
  const compRefW = compAnchors.reduce((s, a) => s + (a.weight || 0), 0);
  const compRef = compRefW ? compAnchors.reduce((s, a) => s + (a.mid || 0) * (a.weight || 0), 0) / compRefW : 0;

  // 1c. NameBio — recorded PUBLIC SALES of the EXACT domain. The strongest signal
  // for a STABLE name (a real clearing price for this very name) — but an OLD, cheap
  // aftermarket/drop sale of a name that has SINCE become a live, branded company is
  // a STALE price, not today's clearing price. So weight it by recency + sale count,
  // and when it sits far below where comparable names clear AND the name is now in
  // live commercial use, treat it as a stale FLOOR rather than the anchor mid.
  const nbSales = (namebio && Array.isArray(namebio.sales) ? namebio.sales : []).filter((s) => s && s.price > 0);
  if (nbSales.length) {
    const prices = nbSales.map((s) => s.price);
    const mid = median(prices);
    const yrs = newestSaleYears(nbSales);
    const recencyW = yrs == null ? 0.7 : yrs < 1 ? 1.0 : yrs < 2 ? 0.7 : yrs < 3 ? 0.5 : 0.32;
    const countW = nbSales.length >= 3 ? 1.0 : nbSales.length === 2 ? 0.85 : 0.7;
    const stale = compRef > 0 && mid < compRef * 0.5 && activeUse;
    const weight = 2.2 * recencyW * countW * (stale ? 0.4 : 1);
    anchors.push({
      source: 'namebio',
      low: Math.min(...prices) * 0.85,
      mid: stale ? Math.max(mid, compRef * 0.5) : mid,
      high: Math.max(...prices) * (stale ? 1.8 : 1.1),
      weight,
      note: stale
        ? `${nbSales.length} OLD exact-domain sale${nbSales.length > 1 ? 's' : ''} (median $${niceRound(mid).toLocaleString()}) predating the name's current live use — treated as a stale floor, not the clearing price.`
        : `${nbSales.length} recorded sale${nbSales.length > 1 ? 's' : ''} of this exact domain (median $${niceRound(mid).toLocaleString()}${yrs != null && yrs >= 2 ? `, newest ~${Math.round(yrs)}y old` : ''}).`,
    });
  }

  // 2. Snagged deal history — real offers/budgets WE saw for this exact domain.
  // A firm offer is what a real buyer would pay; a stated budget is softer.
  const offers = (Array.isArray(dealOffers) ? dealOffers : []).filter((o) => o && o.amountNum > 0);
  if (offers.length) {
    const firm = offers.filter((o) => o.kind === 'offer').map((o) => o.amountNum);
    const all = offers.map((o) => o.amountNum);
    const peak = Math.max(...all);
    const mid = firm.length ? median(firm) : median(all) * 0.85;
    anchors.push({
      source: 'snagged_deal_history',
      low: Math.min(...all) * 0.9,
      mid,
      high: peak * 1.05,
      weight: firm.length ? 2.5 : 1.4,
      note: `Snagged has ${offers.length} real ${firm.length ? 'offer/budget figure' : 'budget'}${offers.length > 1 ? 's' : ''} on this domain (peak $${niceRound(peak).toLocaleString()}).`,
    });
  }

  // (Asking-price "similar listing" comps are intentionally NOT a value anchor —
  // we price off names that actually SOLD, not what others are asking.)

  // 4. Appraise.net AI valuation — the NAME-SPECIFIC read (it bakes in brandability:
  // length, how desirable the concept is, ease/spelling). Appraise.net is already a
  // conservative/realizable estimate, so only a light haircut. Weighted by quality
  // TIER: for a NON-premium name it's the reality check (a rich .ai comp set otherwise
  // over-positions a so-so name like alliteration.ai), so it anchors hard; for a
  // grade-A name it's light (a conservative appraisal shouldn't cap a true premium).
  if (appraise && appraise.mid > 0) {
    const disc = 0.85;
    const rawMid = appraise.mid * disc;
    // Real SOLD comps are the ceiling of reality. Appraise.net is TRAFFIC-based and
    // wildly over-appraises high-volume keywords (dog.app → $925K vs comps maxing at
    // $65K), so when we have a comp reference, BOUND the appraisal anchor to a sane
    // multiple of it. It still pulls DOWN freely when it's conservative (below comps —
    // the alliteration case). And when the raw appraisal sits far ABOVE the comps it's
    // unreliable, so it loses the heavy non-premium weight.
    const apMid = compRef > 0 ? Math.min(rawMid, compRef * 1.6) : rawMid;
    const farAbove = compRef > 0 && rawMid > compRef * 2.5;
    const weight = qScore >= 85 ? 1.1 : (farAbove ? 1.0 : 2.6);
    anchors.push({
      source: 'appraise_net',
      low: Math.min((appraise.low || appraise.mid) * disc * 0.8, apMid * 0.85),
      mid: apMid,
      high: Math.min((appraise.high || appraise.mid) * disc * 1.25, apMid * 1.3),
      weight,
      note: `Appraise.net estimate $${niceRound(appraise.mid).toLocaleString()}${apMid < rawMid ? ` (bounded to comps — Appraise.net over-weights traffic)` : ' — name-specific valuation (reflects brandability)'}${qScore >= 85 || farAbove ? '' : '; weighted for this tier'}.`,
    });
  }

  // 5. Atom appraisal — discounted ~0.4 (Atom runs higher still).
  if (atom && atom.value > 0) {
    anchors.push({
      source: 'atom',
      low: atom.value * 0.4 * 0.6,
      mid: atom.value * 0.4,
      high: atom.value * 0.4 * 1.6,
      weight: 0.8,
      note: `Atom estimate $${niceRound(atom.value).toLocaleString()} (heavily discounted — Atom skews high).`,
    });
  }

  // 6. Current listing ask — what the CURRENT holder wants. Not a value anchor so
  // much as a ceiling/context: for an investment buy you want to land well under it.
  if (listing && listing.price > 0) {
    anchors.push({
      source: 'current_ask',
      low: listing.price * 0.25,
      mid: listing.price * 0.45,
      high: listing.price * 0.8,
      weight: 0.5,
      note: `Currently listed at $${niceRound(listing.price).toLocaleString()}${listing.platform ? ` on ${listing.platform}` : ''} — that's the ask, not the value.`,
    });
  }

  // 7. Quality baseline — always present as a sanity anchor so a name with zero
  // comps still gets a defensible number, and a great/poor name is pulled up/down.
  const qb = qualityBaseline(quality);
  anchors.push({
    source: 'quality_model',
    low: qb.low,
    mid: qb.mid,
    high: qb.high,
    weight: anchors.length ? 0.35 : 1.2, // a sanity floor only — real comps should drive a well-comped name
    note: `Quality model baseline for a grade-${(quality && quality.grade) || '?'} ${quality && quality.tld ? `.${quality.tld.tld}` : ''} name.`,
  });

  return anchors;
}

// Weighted blend of anchors → realizable resale value range.
function blend(anchors) {
  let wsum = 0;
  let low = 0;
  let mid = 0;
  let high = 0;
  for (const a of anchors) {
    const w = a.weight || 0;
    wsum += w;
    low += (a.low || a.mid || 0) * w;
    mid += (a.mid || 0) * w;
    high += (a.high || a.mid || 0) * w;
  }
  if (!wsum) return { low: 0, mid: 0, high: 0 };
  return { low: low / wsum, mid: mid / wsum, high: high / wsum };
}

// Confidence from the strength + agreement of the evidence. Real sales / real
// offers on the exact domain → high. A few corroborating comps/appraisals →
// medium. Quality model alone → low.
function confidenceOf(anchors, blended) {
  const has = (s) => anchors.some((a) => a.source === s);
  const strong = (has('namebio') ? 1 : 0) + (has('snagged_deal_history') ? 1 : 0) + (has('snagged_transactions') ? 1 : 0);
  const supporting = ['namebio_comps', 'appraise_net', 'atom'].filter(has).length;
  let band = 'low';
  if (strong >= 1 && supporting >= 1) band = 'high';
  else if (strong >= 1 || supporting >= 2) band = 'medium';
  else if (supporting === 1) band = 'low-medium';
  // Wide spread between low and high erodes confidence one notch.
  const spread = blended.mid > 0 ? (blended.high - blended.low) / blended.mid : 99;
  if (spread > 3 && band === 'high') band = 'medium';
  return band;
}

// Map a price to its band given the realizable mid.
export function bandForPrice(price, fairMid) {
  if (!(fairMid > 0) || !(price > 0)) return null;
  const ratio = price / fairMid;
  for (const b of BANDS) {
    if (ratio <= b.max) return { ...b, ratio };
  }
  return { ...BANDS[BANDS.length - 1], ratio };
}

// Full deterministic valuation. Returns the realizable range, the dollar band
// ladder, confidence, the anchors (for display/audit), and — if a price was
// supplied — which band it lands in.
export function computeValuation(input) {
  const anchors = buildAnchors(input);
  const blended = blend(anchors);

  // SLD↔TLD synergy premium — a tight semantic fit (cloud.ai, particle.ai) clears
  // ABOVE its structural comps; a loose pairing (dog.ai) clears below. A visible,
  // tunable lever on the blended value, derived from the quality synergy bonus
  // ([-6,+12] pts → ~[0.9, 1.3]×). This is on TOP of the bonus already flowing
  // through the quality score's comp positioning, deliberately amplified because
  // relatedness is a first-order .ai value driver.
  const synBonus = (input && input.quality && input.quality.synergy && Number(input.quality.synergy.bonus)) || 0;
  const synergyMult = 1 + Math.max(-6, Math.min(12, synBonus)) / 30; // +12→1.40, +10→1.33, -6→0.80

  // Trademark / brand-conflict discount — a LIVE registered mark on the EXACT term
  // (esp. software/AI classes 9 & 42) narrows the realistic buyer pool toward that one
  // holder, suppressing resale value (e.g. inkling.ai ↔ Echo360's "Inkling"). Tunable
  // + inspectable; the strongest signal is an exact live tech-class mark and/or Atom's
  // own TM-conflict count. Conservative by default — crank TM_* once we confirm it
  // fires on the right names.
  const tm = input && input.trademark;
  const atomTm = (input && input.atom && Number(input.atom.tm_conflicts)) || 0;
  let tmMult = 1;
  let tmNote = '';
  if (tm && tm.exact_live && tm.tech_class) { tmMult = 0.7; tmNote = `Live software/AI trademark on the exact term${tm.exact_live_count > 1 ? ` (${tm.exact_live_count} marks)` : ''} — buyer pool narrows to the brand holder.`; }
  else if ((tm && tm.exact_live) || atomTm >= 2) { tmMult = 0.82; tmNote = `Live trademark conflict on the exact term — narrows the buyer pool.`; }
  else if (atomTm === 1) { tmMult = 0.9; tmNote = `Possible trademark conflict flagged.`; }
  // Word-commonness lever — an obscure/academic word (alliteration) brands worse than
  // a common evocative one (vision/flora), so it clears below its structural comps.
  // The multiplier is commonness-ONLY (length/ease already shaped the quality grade).
  const brand = input && input.brandability;
  const brandMult = (brand && Number(brand.mult)) || 1;

  const valueMult = synergyMult * tmMult * brandMult;

  let fairMid = niceRound(blended.mid * valueMult);

  // Brandability / appraisal sanity cap — a rich .ai comp set can over-position a
  // NON-premium name (long, niche, so-so brandability) far above its own name-specific
  // appraisal. For a sub-grade-A name with a real appraisal, cap the mid relative to
  // it (the appraisal already judged the brandability). Premium names (grade A) are
  // exempt — a conservative appraisal shouldn't cap a true premium like flora.ai.
  const qScore = Math.max(0, Math.min(100, (input && input.quality && input.quality.score != null) ? input.quality.score : 50));
  const appr = input && input.appraise;
  if (appr && appr.mid > 0) {
    let cap = niceRound(Math.max(appr.mid * 1.9, (appr.high || appr.mid) * 1.5));
    // LENGTH-ONLY grade-A guard: a short random coinage (e.g. ziaf.com — 4 chars → grade
    // A on length alone) that the appraiser itself rates mediocre (Atom score ≤ 6). The
    // rich short-.com comp set over-positions it on freak high comps (a lone $1.15M sale),
    // but it is NOT a true premium. When Atom scores the name low, trust it: bound the mid
    // to a few× Atom's realizable estimate. Premium grade-A names (strong Atom score) stay
    // exempt — a conservative appraisal shouldn't cap a real premium like flora.ai. Falls
    // back to no-op when Atom data is absent (no key / daily cap) → unchanged behavior.
    const atomScore = (input && input.atom && Number(input.atom.score)) || null; // 0–10
    const atomVal = (input && input.atom && Number(input.atom.value)) || 0;
    const lengthOnlyGradeA = qScore >= 85 && atomScore != null && atomScore <= 6;
    if (lengthOnlyGradeA && atomVal > 0) cap = Math.min(cap, niceRound(atomVal * 3));
    // Sub-grade-A always caps to the name-specific appraisal; a length-only grade-A caps
    // too (regardless of the inflated grade). True premiums (grade A + strong Atom) don't.
    if ((qScore < 85 || lengthOnlyGradeA) && fairMid > cap) fairMid = cap;
  }

  // Keep the displayed RANGE actionable + always valid (low ≤ mid ≤ high): a single
  // outlier comp or a capped mid shouldn't break the band. Range ~[0.6×, 1.6×] mid.
  const fairLow = niceRound(Math.max(fairMid * 0.6, Math.min(fairMid * 0.95, blended.low * valueMult)));
  const fairHigh = niceRound(Math.min(fairMid * 1.6, Math.max(fairMid * 1.05, blended.high * valueMult)));
  const confidence = confidenceOf(anchors, blended);

  // Dollar ranges for each band (from realizable mid). Best→worst.
  let prev = 0;
  const ladder = BANDS.map((b) => {
    const max = b.max === Infinity ? Infinity : niceRound(fairMid * b.max);
    const row = { key: b.key, label: b.label, color: b.color, min: prev, max };
    prev = max === Infinity ? prev : max;
    return row;
  });

  const price = Number(input && input.price) || 0;
  const verdictBand = price > 0 ? bandForPrice(price, fairMid) : null;

  return {
    fair_value: { low: fairLow, mid: fairMid, high: fairHigh },
    realizable_note: 'Estimated realistic RESALE (clearing) value — not asking price.',
    confidence,
    bands: ladder,
    // The most you'd pay and still call it at least a "decent buy".
    recommended_max_bid: niceRound(fairMid * BANDS[1].max),
    price: price || null,
    price_band: verdictBand,
    // Multipliers applied on top of the blended comps (visible for audit).
    synergy_mult: Math.round(synergyMult * 100) / 100,
    brandability: brand ? { score: brand.score, tier: brand.tier, commonness: brand.commonness, zipf: brand.zipf, mult: Math.round(brandMult * 100) / 100 } : null,
    trademark: tmNote ? { mult: Math.round(tmMult * 100) / 100, note: tmNote } : null,
    anchors: anchors.map((a) => ({
      source: a.source,
      low: niceRound(a.low),
      mid: niceRound(a.mid),
      high: niceRound(a.high),
      weight: a.weight,
      note: a.note,
    })),
  };
}

export { BANDS };
export default { computeValuation, buildAnchors, bandForPrice, niceRound };
