// SNAP Research scoring — two INDEPENDENT axes, pure + inspectable. A candidate = high value
// AND high abandonment (both matter; a valuable name someone actively uses isn't a target, and
// an abandoned junk word isn't worth acquiring).

// VALUE (0..100): is this .com worth having? TLD demand + word commonness + brevity.
export function valueScore({ tldCount, zipf, wlen }) {
  let s = 0;
  // TLD demand (0..45) — the word registered across many extensions = proven value.
  const tc = Number(tldCount) || 0;
  s += Math.min(45, tc * 2.2);
  // Commonness (0..35) — zipf 2..6 maps to 0..35 (everyday word = more valuable/brandable).
  const z = Number(zipf) || 0;
  s += Math.max(0, Math.min(35, (z - 2) * (35 / 4)));
  // Brevity (0..20) — shorter SLD is better (3 chars → 20, 12+ → 0).
  const L = Number(wlen) || 12;
  s += Math.max(0, Math.min(20, (12 - L) * (20 / 9)));
  return Math.round(Math.max(0, Math.min(100, s)));
}

// ABANDONMENT (0..100): has the owner let it go? parked/dead + stale footer + unchanged-for-years.
export function abandonScore({ siteStatus, stale, staleYearsAgo, unchangedYears }) {
  let s = 0;
  // Disposition of the live .com.
  if (siteStatus === 'no_resolve') s += 55;        // a valuable word that doesn't even resolve — nobody's using it
  else if (siteStatus === 'parked') s += 45;       // parked page, held but undeveloped
  else if (siteStatus === 'for_sale') s += 18;     // for sale = an ACTIVE seller, weaker "abandoned" signal
  // (active site → 0 here; staleness/unchanged below can still flag an abandoned-in-place site)
  // Stale footer/copyright year (0..30) — the older, the more abandoned-in-place.
  if (stale) s += Math.min(30, 12 + (Number(staleYearsAgo) || 0) * 2.5);
  // Unchanged for years (0..25) — a long Wayback span with no real change = held & untouched.
  const uy = Number(unchangedYears) || 0;
  s += Math.min(25, uy * 2.2);
  return Math.round(Math.max(0, Math.min(100, s)));
}

// Combined surfacing score — the PRODUCT, so BOTH axes must be high to score well.
export function combinedScore(value, abandon) {
  return Math.round((value * abandon) / 100);
}

// A surfaced candidate: both axes clear their floor.
export function isCandidate(value, abandon) {
  return value >= VALUE_FLOOR && abandon >= ABANDON_FLOOR;
}

export const VALUE_FLOOR = 42;
export const ABANDON_FLOOR = 42;
// Below this abandonment score we don't spend the paid TLD-count probe (value axis) — the name
// doesn't look abandoned, so it isn't a target regardless of value.
export const TLD_PROBE_ABANDON_MIN = 38;
