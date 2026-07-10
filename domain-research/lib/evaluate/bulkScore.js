// Bulk Eval — a FAST, cheap investability score for a whole list of domains, so a
// portfolio / CSV can be ranked without running the full paid SNAP Eval on every name.
// Reuses the deterministic evaluate pieces ONLY (no paid per-name calls):
//   - scoreQuality (SLD/TLD craft, pure)
//   - trackerComps (our real Snagged sold-comps — one internal, sheet-cached call)
//   - computeValuation (weighted anchors → realizable resale mid + price bands)
// The heavy paid pass stays a per-name drill-down (the SNAP Eval tool, cached).

import { cleanDomainInput } from '../util.js';
import { filterDictionaryWords } from '../db/dictionary.js';
import { scoreQuality } from './quality.js';
import { trackerComps } from './trackerComps.js';
import { computeValuation, bandForPrice, niceRound } from './score.js';

// A coined name (no dictionary meaning) with NO exact comps has no defensible premium —
// its value is speculative brandability, not a position on a premium-sales distribution.
// Estimate a realistic WHOLESALE floor instead: a great-sounding short coinage tops out
// ~$2k wholesale, junk near $50. Deliberately conservative — the fast scan should never
// slap a five/six-figure number on a random coined string just because it's short + clean.
function coinedFloor(quality) {
  const s = Number(quality.score) || 0;
  const len = Number(quality.length) || 8;
  const tldLiq = quality.tld && Number(quality.tld.liquidity) >= 0 ? Number(quality.tld.liquidity) : 0.5;
  let base = s >= 85 ? 1500 : s >= 72 ? 600 : s >= 58 ? 250 : 75;
  if (len <= 5) base *= 1.4;
  else if (len >= 8) base *= 0.5;
  base *= 0.4 + 0.6 * tldLiq; // .com liquid; .org/.net/coined-ccTLD clear for less
  return niceRound(base);
}

const sldTld = (domain) => {
  const d = String(domain || '').toLowerCase();
  const dot = d.indexOf('.');
  const last = d.lastIndexOf('.');
  return { sld: dot > 0 ? d.slice(0, dot) : d, tld: last > 0 ? d.slice(last + 1) : '' };
};

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// names: [{ domain, price? }]. Returns { results:[...], has_prices, count }.
// Each result: domain, price, quality {score,grade}, resale {low,mid,high}, band
// (when priced), roi, upside, confidence, comps (# tracker comps used), error.
export async function bulkEvaluate(names, env = process.env) {
  // Normalize + validate; keep bad rows as errored (so the row count matches the input).
  const rows = (names || []).map((n) => {
    const raw = typeof n === 'string' ? { domain: n } : (n || {});
    let domain = null;
    try { domain = cleanDomainInput(raw.domain); } catch { domain = null; }
    const price = Number(raw.price) > 0 ? Number(raw.price) : null;
    return { input: String(raw.domain || ''), domain, price };
  });

  // One batched dictionary check for every SLD (cheap; drives the quality grade).
  const valid = rows.filter((r) => r.domain);
  const words = await filterDictionaryWords(valid.map((r) => sldTld(r.domain).sld)).catch(() => new Set());

  const results = await mapLimit(rows, 6, async (r) => {
    if (!r.domain) return { domain: r.input, error: 'invalid domain' };
    const { sld, tld } = sldTld(r.domain);
    try {
      const quality = scoreQuality({ sld, tld, isWord: words.has(sld) });
      const trackerRaw = await trackerComps({ sld, tld, len: sld.length }, env).catch(() => null);
      // Only EXACT word-match comps (the same SLD on another TLD) are a real value signal
      // for THIS name. A `same_tld` match is just "other similar-length names sold for $X"
      // — a length DISTRIBUTION, not a comp — which is what wildly inflated coined strings
      // (fabraw.com → $330k). Keep only `same_sld` as the value anchor.
      const realComps = trackerRaw && Array.isArray(trackerRaw.deals) ? trackerRaw.deals.filter((d) => d.relation === 'same_sld') : [];
      const trackerAnchor = realComps.length ? { ...trackerRaw, deals: realComps } : null;

      const val = computeValuation({ quality, tracker: trackerAnchor, price: r.price || 0 });
      let mid = val.fair_value.mid;
      let confidence = val.confidence;
      const isWord = quality.dictionary_class === 'word';
      let basis = realComps.length ? 'comps' : isWord ? 'word' : 'quality';
      let speculative = false;

      // Coined name (no dictionary meaning) + no exact comps → no real basis for a premium.
      // Floor to a realistic wholesale value and flag it speculative, rather than pricing
      // it off a premium distribution it doesn't belong to.
      if (!isWord && !realComps.length) {
        const floor = coinedFloor(quality);
        if (mid > floor) mid = floor;
        confidence = 'speculative';
        basis = 'speculative';
        speculative = true;
      }

      const resale = { low: niceRound(mid * 0.6), mid, high: niceRound(mid * 1.6) };
      const band = r.price ? bandForPrice(r.price, mid) : null;
      const roi = r.price ? Math.round(((mid - r.price) / r.price) * 100) / 100 : null;
      return {
        domain: r.domain,
        price: r.price,
        quality: { score: quality.score, grade: quality.grade, dictionary_class: quality.dictionary_class },
        resale,
        band: band ? { key: band.key, label: band.label, color: band.color, ratio: Math.round((band.ratio || 0) * 100) / 100 } : null,
        roi,
        upside: r.price ? mid - r.price : null,
        confidence,
        basis,
        speculative,
        comps: realComps.length,
      };
    } catch (e) {
      return { domain: r.domain, price: r.price, error: String((e && e.message) || e) };
    }
  });

  const hasPrices = results.some((x) => x && x.price);
  // Rank: with prices → best ROI first (the best deals to buy); without → highest
  // estimated resale first (the best names to target). Errors sink to the bottom.
  const rank = (a, b) => {
    if (a.error && !b.error) return 1;
    if (b.error && !a.error) return -1;
    if (hasPrices) return (b.roi ?? -Infinity) - (a.roi ?? -Infinity);
    return (b.resale?.mid ?? -1) - (a.resale?.mid ?? -1);
  };
  results.sort(rank);
  results.forEach((r, i) => { r.rank = i + 1; });

  return { results, has_prices: hasPrices, count: results.length };
}

export default { bulkEvaluate };
