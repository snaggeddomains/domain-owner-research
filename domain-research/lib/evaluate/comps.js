// Comparable-sales gathering for the purchase evaluator. Three independent comp
// sources, each best-effort + fail-open (a missing source never breaks the eval):
//   • NameBio       — recorded PUBLIC SALES of the exact domain (paid, 1 credit).
//   • Internal DB   — ASKING prices of structurally-similar names from our own
//                     corpora (name_universe = automated marketplace feeds; Master
//                     = curated). Same TLD + similar length/word-count.
//   • Deal history  — handled in lib/db/dealComps.js (Snagged's real offers).
//
// Internal comps are ASKING prices (inflated, and similar-not-identical), so the
// scoring model discounts them hard; here we just gather the distribution.

import { runTool } from '../sources/index.js';
import { getNamingDb, isNamingDbConfigured } from '../db/supabase-naming.js';
import { getMasterlistDb, isMasterlistDbConfigured } from '../db/masterlist.js';

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

// NameBio exact-domain sales. Returns { sales:[{price,date,venue}], note } or null.
// Paid (1 credit) — fail-open so a NameBio outage/misconfig never blocks the eval.
export async function namebioComps(domain, env = process.env) {
  try {
    const r = await runTool('namebio_sales', { domain }, env);
    if (r && r.ok && r.data) return r.data;
  } catch { /* fail-open */ }
  return null;
}

// Structurally-similar PRICED names from name_universe (the big automated
// marketplace corpus). Same bare TLD, length within ±2, matching word-count /
// dictionary class for a like-for-like compare. Unordered bounded sample (a sort
// over millions of rows risks the statement timeout — a bounded sample is plenty
// for a rough asking-price distribution). Fail-open → empty.
async function universeComps({ tld, len, numWords, isWord }) {
  if (!isNamingDbConfigured()) return [];
  try {
    let q = getNamingDb()
      .from('name_universe')
      .select('domain, best_price')
      .eq('tld', tld)
      .gt('best_price', 50)
      .lt('best_price', 5000000)
      .gte('sld_length', Math.max(1, len - 2))
      .lte('sld_length', len + 2)
      .limit(400);
    if (isWord) q = q.eq('is_dictionary_word', true);
    if (numWords != null) q = q.eq('num_words', numWords);
    const { data, error } = await q;
    if (error) return [];
    return (data || [])
      .map((r) => ({ domain: r.domain, price: Number(r.best_price) || 0 }))
      .filter((r) => r.price > 0);
  } catch { return []; }
}

// Same idea against the curated Master Domain List (every row is for sale). Master
// stores tld + price + sld_length; dictionary flag is TEXT 'Y'/'N'. Best-effort.
async function masterComps({ tld, len, isWord }) {
  if (!isMasterlistDbConfigured()) return [];
  try {
    let q = getMasterlistDb()
      .from('Master Domain List')
      .select('domain, price, sld_length')
      .eq('tld', tld)
      .gt('price', 50)
      .lt('price', 5000000)
      .gte('sld_length', Math.max(1, len - 2))
      .lte('sld_length', len + 2)
      .limit(400);
    if (isWord) q = q.eq('dictionary_word', 'Y');
    const { data, error } = await q;
    if (error) return [];
    return (data || [])
      .map((r) => ({ domain: r.domain, price: Number(r.price) || 0 }))
      .filter((r) => r.price > 0);
  } catch { return []; }
}

// Internal asking-price comps across both corpora → a distribution + a few
// representative examples. Returns { count, p25, p50, p75, tld, examples[] }.
export async function internalComps({ tld, len, numWords, isWord }, _env = process.env) {
  const [u, m] = await Promise.all([
    universeComps({ tld, len, numWords, isWord }),
    masterComps({ tld, len, isWord }),
  ]);
  // Dedupe by domain (universe first), pool the prices.
  const seen = new Set();
  const pool = [];
  for (const r of [...u, ...m]) {
    if (seen.has(r.domain)) continue;
    seen.add(r.domain);
    pool.push(r);
  }
  if (!pool.length) return { count: 0, tld, examples: [] };
  const prices = pool.map((r) => r.price).sort((a, b) => a - b);
  // Examples: a low, a median, and a high comp so the user sees the spread.
  const sortedByPrice = [...pool].sort((a, b) => a.price - b.price);
  const pick = (frac) => sortedByPrice[Math.min(sortedByPrice.length - 1, Math.floor(frac * (sortedByPrice.length - 1)))];
  const examples = [...new Set([pick(0.15), pick(0.5), pick(0.85)].filter(Boolean))]
    .map((r) => ({ domain: r.domain, price: r.price }));
  return {
    count: pool.length,
    p25: percentile(prices, 25),
    p50: percentile(prices, 50),
    p75: percentile(prices, 75),
    tld,
    examples,
  };
}

export default { namebioComps, internalComps };
