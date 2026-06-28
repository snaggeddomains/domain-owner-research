// Brandability — how strong a STARTUP BRAND the SLD makes, beyond raw resale comps.
// Three inputs: LENGTH (short = punchy), EASE (pronounceable / spellable), and word
// COMMONNESS (a common, evocative word brands better than an obscure/academic one —
// flora / vision / cloud brand far better than alliteration / perspicacity, even
// though all are real dictionary words). Commonness comes from the corpus wordfreq
// `zipf_score` when we have it. Pure — the caller supplies the zipf lookup.

// wordfreq zipf scale: ~7 = "the", ~5 = everyday speech, ~3.3 = familiar-but-not-
// common, ~2.6 = uncommon, < 2.6 = rare/academic. Maps to a display score + a GENTLE
// value multiplier (the multiplier is the new lever; length/ease already live in the
// quality grade, so we don't re-charge for them here).
export function commonnessTier(zipf) {
  if (zipf == null || !Number.isFinite(Number(zipf))) return { tier: 'unknown', score: null, mult: 1 };
  const z = Number(zipf);
  if (z >= 4.6) return { tier: 'very common', score: 100, mult: 1.1 };
  if (z >= 4.0) return { tier: 'common', score: 84, mult: 1.05 };
  if (z >= 3.3) return { tier: 'familiar', score: 66, mult: 1.0 };
  if (z >= 2.6) return { tier: 'uncommon', score: 44, mult: 0.9 };
  return { tier: 'obscure', score: 24, mult: 0.78 };
}

function lengthBrand(len) {
  if (len <= 5) return 100;
  if (len <= 7) return 86;
  if (len <= 9) return 66;
  if (len <= 12) return 46;
  return 28;
}

// scoreBrandability({ sld, pronounce, zipf }) →
//   { score 0-100, tier, commonness, zipf, mult, length }
// `pronounce` is the 0-100 pronounceability component from scoreQuality (ease of
// saying/spelling). `zipf` is the corpus word-frequency (or null when unknown).
export function scoreBrandability({ sld, pronounce = 60, zipf = null } = {}) {
  const len = String(sld || '').length;
  const lenB = lengthBrand(len);
  const com = commonnessTier(zipf);
  // Display score blends all three (commonness only when known).
  const parts = com.score != null
    ? [[lenB, 0.4], [pronounce, 0.25], [com.score, 0.35]]
    : [[lenB, 0.62], [pronounce, 0.38]];
  const wsum = parts.reduce((s, [, w]) => s + w, 0);
  const score = Math.round(parts.reduce((s, [v, w]) => s + v * w, 0) / wsum);
  const tier = score >= 80 ? 'strong' : score >= 62 ? 'good' : score >= 44 ? 'fair' : 'weak';
  return {
    score,
    tier,
    commonness: com.tier,
    zipf: zipf != null && Number.isFinite(Number(zipf)) ? Math.round(Number(zipf) * 10) / 10 : null,
    mult: com.mult, // VALUE lever = commonness only (length/ease already in the grade)
    length: len,
  };
}

export default { scoreBrandability, commonnessTier };
