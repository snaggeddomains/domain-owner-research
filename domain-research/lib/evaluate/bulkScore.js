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
import { computeValuation } from './score.js';

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
      const tracker = await trackerComps({ sld, tld, len: sld.length }, env).catch(() => null);
      const val = computeValuation({ quality, tracker, price: r.price || 0 });
      const mid = val.fair_value.mid;
      const roi = r.price ? Math.round(((mid - r.price) / r.price) * 100) / 100 : null;
      return {
        domain: r.domain,
        price: r.price,
        quality: { score: quality.score, grade: quality.grade, dictionary_class: quality.dictionary_class },
        resale: val.fair_value,
        band: val.price_band ? { key: val.price_band.key, label: val.price_band.label, color: val.price_band.color, ratio: Math.round((val.price_band.ratio || 0) * 100) / 100 } : null,
        roi,
        upside: r.price ? mid - r.price : null,
        confidence: val.confidence,
        comps: tracker && Array.isArray(tracker.deals) ? tracker.deals.length : 0,
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
