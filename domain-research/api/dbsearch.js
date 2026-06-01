// DB Search — filterable browse across our two corpora:
//   • name Universe   (name_universe, SUPABASE_NAMING_*)  — the broad market
//   • Master Domain List (MASTERLIST_SUPABASE_*)          — curated/owned
// `db` = both (default) | universe | master. The two tables are in different
// Supabase projects with different schemas, so each is queried with its own
// column mapping and the results are normalized to a common row shape.
//
// Pagination: single-DB modes page server-side via range(). "both" fetches a
// capped window from each, merges + dedupes (a domain in both → owner/price
// from the curated Master record), sorts, and slices the page — accurate for
// the first pages, which is the common case. Gated by the `dbsearch` permission.

import { currentUser, userCan } from '../lib/auth.js';
import { getNamingDb, isNamingDbConfigured } from '../lib/db/supabase-naming.js';
import { getMasterlistDb, isMasterlistDbConfigured } from '../lib/db/masterlist.js';

const UNIVERSE = 'name_universe';
const MASTER = 'Master Domain List';
const MAX_LIMIT = 100;
const MERGE_CAP = 1000; // max rows to pull per source in "both" mode

const OWNER_BY_SOURCE = {
  snagged_snap_sheet: 'Snagged',
  berserk_snap_sheet: 'Snagged',
  rob_purchases_sheet: 'Rob Schutz',
};
function ownerFor(sources) {
  for (const s of Array.isArray(sources) ? sources : []) if (OWNER_BY_SOURCE[s]) return OWNER_BY_SOURCE[s];
  return null;
}

const num = (v) => (v === undefined || v === '' || v === null || isNaN(Number(v)) ? null : Number(v));
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const csv = (v) => (str(v) ? str(v).split(',').map((x) => x.trim()).filter(Boolean) : null);
// We're standardizing TLDs to the bare form ("com") across both DBs, but legacy
// rows may still be dotted (".com") until the one-time backfills run. Match BOTH
// forms so the count is the true total of .com domains regardless of storage
// convention — and it stays correct once everything is normalized (no dotted
// rows left to match). A domain appears once, so this never double-counts.
const bareTlds = (arr) => arr.map((t) => (t.startsWith('.') ? t.slice(1) : t));
const tldVariants = (arr) => bareTlds(arr).flatMap((t) => [t, '.' + t]);

// Any narrowing filter applied? When none are, an exact COUNT over the whole
// corpus is wasteful — use the fast planner estimate. Once filtered, the set is
// small enough that an exact count is cheap AND the accuracy matters.
const FILTER_KEYS = ['q', 'price_min', 'price_max', 'tld', 'len_exact', 'len_min', 'len_max',
  'single_word', 'dict_word', 'words_min', 'words_max', 'no_numbers', 'source', 'category', 'emotion', 'owner', 'keyword'];
function hasActiveFilters(p) {
  return FILTER_KEYS.some((k) => str(p[k]));
}

// Map a sort key to each table's column (they differ).
const UNIVERSE_SORT = { domain: 'domain', price: 'best_price', source: 'best_price_source' };
const MASTER_SORT = { domain: 'domain', price: 'price', source: 'source' };

function buildUniverse(p, ascending, countMode) {
  let q = getNamingDb()
    .from(UNIVERSE)
    .select('domain, sld, tld, sld_length, num_words, is_dictionary_word, best_price, best_price_source, sources, category, emotions, keywords', { count: countMode });
  const text = str(p.q);
  if (text) q = q.ilike('sld', (p.fuzzy === '1' ? '%' : '') + text.toLowerCase() + '%');
  const tlds = csv(p.tld);
  if (tlds) {
    q = q.in("tld", tldVariants(tlds));
    // A TLD chip means a clean registrable domain (sld.tld). Exclude multi-label
    // hosts like ab.co.com / liven.it.com — their real suffix is co.com/it.com,
    // not com, but a mis-extracted tld column can tag them 'com'.
    q = q.not('domain', 'like', '%.%.%');
  }
  const pmin = num(p.price_min); if (pmin != null) q = q.gte('best_price', pmin);
  const pmax = num(p.price_max); if (pmax != null) q = q.lte('best_price', pmax);
  const le = num(p.len_exact);
  if (le != null) q = q.eq('sld_length', le);
  else { const a = num(p.len_min); if (a != null) q = q.gte('sld_length', a); const b = num(p.len_max); if (b != null) q = q.lte('sld_length', b); }
  if (p.single_word === 'yes') q = q.eq('num_words', 1); else if (p.single_word === 'no') q = q.gt('num_words', 1);
  if (p.dict_word === 'yes') q = q.eq('is_dictionary_word', true); else if (p.dict_word === 'no') q = q.eq('is_dictionary_word', false);
  const wmin = num(p.words_min); if (wmin != null) q = q.gte('num_words', wmin);
  const wmax = num(p.words_max); if (wmax != null) q = q.lte('num_words', wmax);
  if (p.no_numbers === '1') q = q.not('sld', 'match', '[0-9]');
  const sources = csv(p.source); if (sources) q = q.overlaps('sources', sources);
  const cats = csv(p.category); if (cats) q = q.in('category', cats);
  const emo = csv(p.emotion); if (emo) q = q.overlaps('emotions', emo);
  const kw = str(p.keyword); if (kw) q = q.or(`keywords.cs.{${kw.toLowerCase()}},sld.ilike.%${kw.toLowerCase()}%`);
  return q.order(UNIVERSE_SORT[p.sort] || 'domain', { ascending, nullsFirst: false });
}

function normUniverse(r) {
  return {
    domain: r.domain, best_price: r.best_price,
    best_price_source: r.best_price_source || (Array.isArray(r.sources) && r.sources[0]) || null,
    sources: r.sources || [], owner: ownerFor(r.sources), category: r.category || null, db: 'universe',
  };
}

function buildMaster(p, ascending, countMode) {
  // Master Domain List columns differ: domain (no sld), price, owner, source
  // (single text), number_of_words (numeric), category, tld, sld_length, and
  // is_single_word / dictionary_word are TEXT 'Y'/'N' (NOT booleans/ints — match
  // the Admin/Supabase view exactly). keywords/emotions are TEXT (not arrays).
  let q = getMasterlistDb()
    .from(MASTER)
    .select('domain, price, owner, source, category, tld, sld_length, number_of_words', { count: countMode });
  const text = str(p.q);
  if (text) q = q.ilike('domain', '%' + text.toLowerCase() + '%');
  const tlds = csv(p.tld);
  if (tlds) {
    q = q.in("tld", tldVariants(tlds));
    q = q.not('domain', 'like', '%.%.%'); // clean sld.tld only — exclude ab.co.com etc.
  }
  const pmin = num(p.price_min); if (pmin != null) q = q.gte('price', pmin);
  const pmax = num(p.price_max); if (pmax != null) q = q.lte('price', pmax);
  const le = num(p.len_exact);
  if (le != null) q = q.eq('sld_length', le);
  else { const a = num(p.len_min); if (a != null) q = q.gte('sld_length', a); const b = num(p.len_max); if (b != null) q = q.lte('sld_length', b); }
  if (p.single_word === 'yes') q = q.eq('is_single_word', 'Y'); else if (p.single_word === 'no') q = q.eq('is_single_word', 'N');
  if (p.dict_word === 'yes') q = q.eq('dictionary_word', 'Y'); else if (p.dict_word === 'no') q = q.eq('dictionary_word', 'N');
  const wmin = num(p.words_min); if (wmin != null) q = q.gte('number_of_words', wmin);
  const wmax = num(p.words_max); if (wmax != null) q = q.lte('number_of_words', wmax);
  // Master has no `sld` column, so apply "no numbers" to `domain` (digits only
  // appear in the SLD — the TLD is alphabetic).
  if (p.no_numbers === '1') q = q.not('domain', 'match', '[0-9]');
  const cats = csv(p.category); if (cats) q = q.in('category', cats);
  const src = str(p.source); if (src) q = q.ilike('source', '%' + src + '%');
  const kw = str(p.keyword); if (kw) q = q.ilike('keywords', '%' + kw.toLowerCase() + '%');
  const emo = str(p.emotion); if (emo) q = q.ilike('emotions', '%' + emo.toLowerCase() + '%');
  const owner = str(p.owner); if (owner) q = q.ilike('owner', '%' + owner + '%');
  return q.order(MASTER_SORT[p.sort] || 'domain', { ascending, nullsFirst: false });
}

function normMaster(r) {
  return {
    domain: r.domain, best_price: r.price, best_price_source: r.source || null,
    sources: r.source ? [r.source] : [], owner: r.owner || null, category: r.category || null, db: 'master',
  };
}

function sortRows(rows, sort, ascending) {
  const key = sort === 'price' ? 'best_price' : sort === 'source' ? 'best_price_source' : 'domain';
  const dir = ascending ? 1 : -1;
  return rows.sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // nulls last
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.status(405).json({ error: 'Use GET' }); return; }
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (!userCan(user, 'dbsearch')) { res.status(403).json({ error: 'You don’t have access to DB Search.' }); return; }

  const p = req.query;
  const page = Math.max(0, num(p.page) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, num(p.limit) || 50));
  const ascending = (p.dir || 'asc') !== 'desc';
  let db = (str(p.db) || 'both').toLowerCase();
  if (!['both', 'universe', 'master'].includes(db)) db = 'both';

  const wantUniverse = (db === 'both' || db === 'universe') && isNamingDbConfigured();
  const wantMaster = (db === 'both' || db === 'master') && isMasterlistDbConfigured();
  if (!wantUniverse && !wantMaster) { res.status(500).json({ error: 'No databases configured for the selected source.' }); return; }

  const ownerFilter = str(p.owner) ? str(p.owner).toLowerCase() : null;
  // Exact count only matters once filtered; the unfiltered corpus count is huge
  // and slow to count exactly, so use the fast planner estimate by default.
  const countMode = hasActiveFilters(p) ? 'exact' : 'estimated';

  try {
    // ── Single-DB modes: clean server-side pagination via range() ──
    if (db === 'universe' || db === 'master') {
      const start = page * limit;
      const endIdx = start + limit - 1;
      let rows;
      let count = null;
      if (db === 'universe') {
        const { data, error, count: c } = await buildUniverse(p, ascending, countMode).range(start, endIdx);
        if (error) throw error;
        rows = (data || []).map(normUniverse); count = c ?? null;
      } else {
        const { data, error, count: c } = await buildMaster(p, ascending, countMode).range(start, endIdx);
        if (error) throw error;
        rows = (data || []).map(normMaster); count = c ?? null;
      }
      if (ownerFilter) rows = rows.filter((r) => (r.owner || '').toLowerCase().includes(ownerFilter));
      res.status(200).json({ rows, page, limit, db, count, approx: countMode === 'estimated', has_more: rows.length === limit });
      return;
    }

    // ── Both: fetch a capped window from EACH source (not just the current
    // page's worth — otherwise dedupe of owned domains present in both DBs can
    // collapse a page and stop pagination), merge, dedupe, sort, then slice. ──
    const [uRes, mRes] = await Promise.all([
      buildUniverse(p, ascending, countMode).range(0, MERGE_CAP - 1).then((r) => r).catch((e) => ({ error: e })),
      buildMaster(p, ascending, countMode).range(0, MERGE_CAP - 1).then((r) => r).catch((e) => ({ error: e })),
    ]);
    const errors = {};
    let merged = [];
    if (uRes.error) errors.universe = uRes.error.message || String(uRes.error);
    else merged = merged.concat((uRes.data || []).map(normUniverse));
    if (mRes.error) errors.master = mRes.error.message || String(mRes.error);
    else {
      // Master takes precedence on overlap (curated owner/price/category).
      const masterRows = (mRes.data || []).map(normMaster);
      const masterDomains = new Set(masterRows.map((r) => (r.domain || '').toLowerCase()));
      merged = merged.filter((r) => !masterDomains.has((r.domain || '').toLowerCase()));
      // tag domains present in both
      const uniDomains = new Set((uRes.data || []).map((r) => (r.domain || '').toLowerCase()));
      for (const r of masterRows) if (uniDomains.has((r.domain || '').toLowerCase())) r.db = 'both';
      merged = merged.concat(masterRows);
    }
    if (ownerFilter) merged = merged.filter((r) => (r.owner || '').toLowerCase().includes(ownerFilter));
    merged = sortRows(merged, p.sort || 'domain', ascending);
    const start = page * limit;
    const rows = merged.slice(start, start + limit);
    // Total matches across both DBs (estimated; ignores cross-DB overlap).
    const count = ((uRes && uRes.count) || 0) + ((mRes && mRes.count) || 0);
    res.status(200).json({ rows, page, limit, db, count, approx: countMode === 'estimated', has_more: merged.length > start + limit, errors });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}
