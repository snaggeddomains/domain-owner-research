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

// CSV export can paginate well past a single page, so give it room.
export const config = { maxDuration: 60 };

const UNIVERSE = 'name_universe';
const MASTER = 'Master Domain List';
const MAX_LIMIT = 100;
const MERGE_CAP = 1000; // max rows to pull per source in "both" mode
const EXPORT_MAX = 50000; // hard cap on a CSV export
const EXPORT_PAGE = 1000;  // rows per request when paginating an export

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
// Master stores emotions Capitalized ("Trust"); array operators are exact +
// case-sensitive, so title-case the incoming filter to match.
const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
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
  'single_word', 'dict_word', 'words_min', 'words_max', 'syll_min', 'syll_max', 'no_numbers', 'source', 'category', 'emotion', 'connotation', 'industry', 'part_of_speech', 'exclude_forms', 'owner', 'keyword'];

// Word-form exclusions (Plurals / Past tense / -ing / -ly): drop SLDs ending in
// the form. Same heuristic as the Naming Exercise (plural = trailing 's' that
// isn't ss/us/is/as/os), applied as a SQL POSIX-regex exclusion like the existing
// "no numbers" filter so counts stay exact. Universe matches on `sld`; Master has
// no sld column, so it matches the SLD right before the final .tld on `domain`.
const FORM_SLD = { plural: '[^suaio]s$', past: 'ed$', ing: 'ing$', ly: 'ly$' };
const FORM_DOMAIN = { plural: '[^suaio]s\\.[a-z]+$', past: 'ed\\.[a-z]+$', ing: 'ing\\.[a-z]+$', ly: 'ly\\.[a-z]+$' };
function hasActiveFilters(p) {
  return FILTER_KEYS.some((k) => str(p[k]));
}

// Map a sort key to each table's column (they differ).
const UNIVERSE_SORT = { domain: 'domain', price: 'best_price', source: 'best_price_source' };
const MASTER_SORT = { domain: 'domain', price: 'price', source: 'source' };

function buildUniverse(p, ascending, countMode) {
  let q = getNamingDb()
    .from(UNIVERSE)
    .select('domain, sld, tld, sld_length, num_words, is_dictionary_word, best_price, best_price_source, sources, category, emotions, keywords, part_of_speech', { count: countMode });
  const text = str(p.q);
  if (text) {
    const t = text.toLowerCase();
    // Stored SLDs don't include the TLD. If the user pasted a full domain
    // (e.g. "crowdova.com"), match the `domain` column directly — exact-
    // match, the same behavior the DB Screen has. Bare keywords (no dot)
    // stay on the SLD-prefix browse path so "show me everything starting
    // with pulse" is unchanged.
    if (t.includes('.')) {
      // Full domain → exact match. Universe domains are stored canonically
      // lowercase (and `t` is lowercased), so `.eq` hits the unique b-tree
      // index. `.ilike` is case-insensitive and CANNOT use that index, so it
      // seq-scans millions of rows → statement timeout (the search hangs). DB
      // Screen makes the same choice for the same reason.
      // An exact-domain lookup is "do we have THIS name" — the sidebar browse
      // filters (length/TLD/word-count/…) are irrelevant to it and only cause
      // confusing false zeroes (a stale "max length 8" hides teamatlas.com,
      // reading as "we don't have it"). So short-circuit: match + return, no
      // browse filters applied. Bare-keyword browse below keeps all filters.
      return q.eq('domain', t).order(UNIVERSE_SORT[p.sort] || 'domain', { ascending, nullsFirst: false });
    } else {
      // Default to a CONTAINS match (atlas → teamatlas / videoatlas), not just a
      // prefix — this matches Master's behavior (already substring) and the natural
      // "show me the word anywhere" expectation. The trigram GIN index
      // idx_universe_sld_trgm backs `%x%` for queries >= 3 chars, so it stays fast
      // over the millions of rows. Sub-3-char queries keep the prefix form (trigram
      // can't index < 3 chars → a leading-% would seq-scan) UNLESS Fuzzy is checked.
      const contains = p.fuzzy === '1' || t.length >= 3;
      q = q.ilike('sld', (contains ? '%' : '') + t + '%');
    }
  }
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
  const symin = num(p.syll_min); if (symin != null) q = q.gte('num_syllables', symin);
  const symax = num(p.syll_max); if (symax != null) q = q.lte('num_syllables', symax);
  if (p.no_numbers === '1') q = q.not('sld', 'match', '[0-9]');
  const sources = csv(p.source); if (sources) q = q.overlaps('sources', sources);
  const cats = csv(p.category); if (cats) q = q.in('category', cats);
  const emo = csv(p.emotion); if (emo) q = q.overlaps('emotions', emo);
  const con = csv(p.connotation); if (con) q = q.in('connotation', con);
  const ind = csv(p.industry); if (ind) q = q.overlaps('industries', ind);
  // Part-of-speech (universe-only enrichment): strict any-of overlap. Rows not
  // yet POS-enriched have a null/empty array and won't match — coverage fills in
  // as the structural backfill runs.
  const pos = csv(p.part_of_speech); if (pos) q = q.overlaps('part_of_speech', pos);
  // Word-form exclusions. The SLD regex catches consonant+s plurals (cats, offences)
  // but MISSES vowel+s plurals whose singular ends in a vowel (croatias←croatia,
  // aleppos←aleppo) — deliberately, to avoid false-flagging atlas/virus/canvas. The
  // enriched `is_plural` flag (singular is a real dictionary word) catches those. Apply
  // BOTH: the regex covers not-yet-flagged rows, `is_plural` covers the vowel+s gap.
  const forms = csv(p.exclude_forms);
  if (forms) for (const f of forms) {
    if (FORM_SLD[f]) q = q.not('sld', 'match', FORM_SLD[f]);
    if (f === 'plural') q = q.not('is_plural', 'is', true);
  }
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
  // the Admin/Supabase view exactly). keywords/emotions are text[] (migrated
  // 2026-06; match with array operators, not ilike).
  let q = getMasterlistDb()
    .from(MASTER)
    .select('domain, price, owner, source, category, tld, sld_length, number_of_words', { count: countMode });
  const text = str(p.q);
  if (text) {
    const t = text.toLowerCase();
    // Match Universe's behavior: dotted input → exact-domain lookup (the
    // same semantics the DB Screen offers); bare keyword → substring browse.
    // Exact-domain lookup short-circuits past the browse filters (see Universe):
    // "do we have THIS name" shouldn't be silently zeroed by a stale length/TLD.
    if (t.includes('.')) return q.ilike('domain', t).order(MASTER_SORT[p.sort] || 'domain', { ascending, nullsFirst: false });
    q = q.ilike('domain', '%' + t + '%');
  }
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
  const symin = num(p.syll_min); if (symin != null) q = q.gte('syllables', symin);
  const symax = num(p.syll_max); if (symax != null) q = q.lte('syllables', symax);
  // Master has no `sld` column, so apply "no numbers" to `domain` (digits only
  // appear in the SLD — the TLD is alphabetic).
  if (p.no_numbers === '1') q = q.not('domain', 'match', '[0-9]');
  const cats = csv(p.category); if (cats) q = q.in('category', cats);
  const src = str(p.source); if (src) q = q.ilike('source', '%' + src + '%');
  // keywords/emotions are now text[] (migrated 2026-06). Match like the universe
  // side: keyword = array contains the term OR the domain text contains it;
  // emotion = overlaps (any-of), title-cased to match Master's Capitalized values.
  const kw = str(p.keyword); if (kw) { const k = kw.toLowerCase(); q = q.or(`keywords.cs.{${k}},domain.ilike.%${k}%`); }
  const emo = csv(p.emotion); if (emo) q = q.overlaps('emotions', emo.map(titleCase));
  const con = csv(p.connotation); if (con) q = q.in('connotation', con);
  const ind = csv(p.industry); if (ind) q = q.overlaps('industries', ind);
  const owner = str(p.owner); if (owner) q = q.ilike('owner', '%' + owner + '%');
  const forms = csv(p.exclude_forms); if (forms) for (const f of forms) if (FORM_DOMAIN[f]) q = q.not('domain', 'match', FORM_DOMAIN[f]);
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

// Pull EVERY matching row (not just one page) by paging through range() until a
// short page or the export cap. `makeQuery` rebuilds the query per page.
async function fetchAll(makeQuery) {
  const out = [];
  for (let start = 0; start < EXPORT_MAX; start += EXPORT_PAGE) {
    const { data, error } = await makeQuery().range(start, Math.min(start + EXPORT_PAGE, EXPORT_MAX) - 1);
    if (error) throw error;
    const batch = data || [];
    out.push(...batch);
    if (batch.length < EXPORT_PAGE) break;
  }
  return out;
}

// Collect the FULL normalized result set for a CSV export (same db/filter/sort
// semantics as the paged search, just uncapped to EXPORT_MAX).
async function collectExport(p, db, ascending, ownerFilter) {
  const posActive = !!csv(p.part_of_speech);
  const wantU = (db === 'both' || db === 'universe') && isNamingDbConfigured();
  const wantM = (db === 'both' || db === 'master') && isMasterlistDbConfigured() && !(posActive && db === 'both');
  let rows = [];
  if (wantU) rows = rows.concat((await fetchAll(() => buildUniverse(p, ascending, undefined))).map(normUniverse));
  if (wantM) {
    const masterRows = (await fetchAll(() => buildMaster(p, ascending, undefined))).map(normMaster);
    if (db === 'both') {
      const md = new Set(masterRows.map((r) => (r.domain || '').toLowerCase()));
      rows = rows.filter((r) => !md.has((r.domain || '').toLowerCase()));
    }
    rows = rows.concat(masterRows);
  }
  if (ownerFilter) rows = rows.filter((r) => (r.owner || '').toLowerCase().includes(ownerFilter));
  rows = sortRows(rows, p.sort || 'domain', ascending);
  return rows.slice(0, EXPORT_MAX);
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function toCsv(rows) {
  const lines = ['domain,price,source,owner,category,db'];
  for (const r of rows) {
    const src = r.best_price_source || (Array.isArray(r.sources) && r.sources[0]) || '';
    lines.push([r.domain, r.best_price ?? '', src, r.owner ?? '', r.category ?? '', r.db].map(csvCell).join(','));
  }
  return lines.join('\r\n');
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
    // ── CSV export: the FULL matching set (uncapped to EXPORT_MAX), same filters ──
    if (str(p.format) === 'csv') {
      const rows = await collectExport(p, db, ascending, ownerFilter);
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="domain-search-${stamp}.csv"`);
      res.status(200).send(toCsv(rows));
      return;
    }

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
    // Part-of-speech is a universe-only attribute; when it's filtered, Master
    // can't be classified, so a "both" query restricts to Universe rather than
    // padding the page with unfilterable Master rows.
    const posActive = !!csv(p.part_of_speech);
    const [uRes, mRes] = await Promise.all([
      buildUniverse(p, ascending, countMode).range(0, MERGE_CAP - 1).then((r) => r).catch((e) => ({ error: e })),
      posActive
        ? Promise.resolve({ data: [], count: 0 })
        : buildMaster(p, ascending, countMode).range(0, MERGE_CAP - 1).then((r) => r).catch((e) => ({ error: e })),
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
