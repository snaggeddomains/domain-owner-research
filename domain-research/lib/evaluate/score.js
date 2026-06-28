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

// Multipliers vs estimated realizable resale value (fairMid). Tunable knobs — the
// whole product's risk appetite lives here.
const BANDS = [
  { key: 'immediate_buy', label: 'Immediate buy', max: 0.35, color: '#0b8f3a' },
  { key: 'decent_buy', label: 'Decent buy', max: 0.6, color: '#5bbf3a' },
  { key: 'neutral', label: 'Neutral / fair', max: 0.95, color: '#caa024' },
  { key: 'would_avoid', label: 'Would avoid', max: 1.4, color: '#e07b2c' },
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
export function buildAnchors({ quality, namebio, namebioComps, tracker, dealOffers, appraise, atom, listing } = {}) {
  const anchors = [];

  // 1. NameBio — recorded PUBLIC SALES of the EXACT domain. The strongest signal:
  // a real clearing price for this very name. (Older sales discounted slightly.)
  const nbSales = (namebio && Array.isArray(namebio.sales) ? namebio.sales : []).filter((s) => s && s.price > 0);
  if (nbSales.length) {
    const prices = nbSales.map((s) => s.price);
    const mid = median(prices);
    anchors.push({
      source: 'namebio',
      low: Math.min(...prices) * 0.85,
      mid,
      high: Math.max(...prices) * 1.1,
      weight: 3.0,
      note: `${nbSales.length} recorded sale${nbSales.length > 1 ? 's' : ''} of this exact domain (median $${niceRound(mid).toLocaleString()}).`,
    });
  }

  // 1b. NameBio COMPARABLE sales — recorded RETAIL sales of SIMILAR names (the comp
  // set when there's no exact-domain sale). Real clearing prices, but for similar-
  // not-this name, so discounted modestly to realizable and weighted below exact.
  const nbComps = (namebioComps && Array.isArray(namebioComps.comps) ? namebioComps.comps : []).filter((c) => c && c.price > 0);
  if (nbComps.length) {
    const prices = nbComps.map((c) => c.price).sort((a, b) => a - b);
    const at = (frac) => prices[Math.min(prices.length - 1, Math.max(0, Math.round(frac * (prices.length - 1))))];
    const DISCOUNT = 0.75; // retail comps run above this specific name's realistic resale
    anchors.push({
      source: 'namebio_comps',
      low: at(0.25) * DISCOUNT,
      mid: at(0.5) * DISCOUNT,
      high: at(0.75) * DISCOUNT,
      weight: 2.0,
      note: `${nbComps.length} comparable NameBio sale${nbComps.length > 1 ? 's' : ''} of similar names (median $${niceRound(at(0.5)).toLocaleString()}).`,
    });
  }

  // 1c. Snagged transaction comps — REAL prices comparable names changed hands at
  // (the Domain Tracker's Deals tab). Verified transactions, so a strong anchor;
  // the exact word on another TLD (same_sld) is the most telling. Light discount.
  const trackerDeals = (tracker && Array.isArray(tracker.deals) ? tracker.deals : []).filter((t) => t && t.price > 0);
  if (trackerDeals.length) {
    // Weight same-SLD-any-TLD comps double when computing the central price.
    const weighted = [];
    for (const t of trackerDeals) { weighted.push(t.price); if (t.relation === 'same_sld') weighted.push(t.price); }
    const sorted = weighted.sort((a, b) => a - b);
    const at = (frac) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(frac * (sorted.length - 1))))];
    const DISCOUNT = 0.85;
    anchors.push({
      source: 'snagged_transactions',
      low: at(0.25) * DISCOUNT,
      mid: at(0.5) * DISCOUNT,
      high: at(0.75) * DISCOUNT,
      weight: 2.4,
      note: `${trackerDeals.length} comparable Snagged transaction${trackerDeals.length > 1 ? 's' : ''} (median $${niceRound(at(0.5)).toLocaleString()}).`,
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

  // 4. Appraise.net AI valuation — discounted ~0.5 (AI appraisals skew high for a
  // resale exit).
  if (appraise && appraise.mid > 0) {
    anchors.push({
      source: 'appraise_net',
      low: (appraise.low || appraise.mid) * 0.5 * 0.7,
      mid: appraise.mid * 0.5,
      high: (appraise.high || appraise.mid) * 0.5 * 1.4,
      weight: 1.0,
      note: `Appraise.net estimate $${niceRound(appraise.mid).toLocaleString()} (discounted to a realistic resale exit).`,
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
    weight: anchors.length ? 0.6 : 1.2, // leans harder when it's the only signal
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
  const fairMid = niceRound(blended.mid);
  const fairLow = niceRound(blended.low);
  const fairHigh = niceRound(blended.high);
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
