// DB Search — filterable browse over the name Universe (name_universe).
// Server-side filtering + pagination + sorting so the UI can page through the
// (multi-million row) corpus. Gated by the `dbsearch` module permission.
//
// Many filters depend on enrichment columns (category, emotions, keywords) that
// are still being backfilled — those simply match less until populated. The
// always-available structural filters (tld, length, word counts, dictionary,
// price, source) work today.

import { currentUser, userCan } from '../lib/auth.js';
import { getNamingDb, isNamingDbConfigured } from '../lib/db/supabase-naming.js';

const TABLE = 'name_universe';
const MAX_LIMIT = 100;

// Owned-feed → owner, mirrors lib/sources/universe_ownership.js.
const OWNER_BY_SOURCE = {
  snagged_snap_sheet: 'Snagged',
  berserk_snap_sheet: 'Snagged',
  rob_purchases_sheet: 'Rob Schutz',
};
function ownerFor(sources) {
  for (const s of Array.isArray(sources) ? sources : []) {
    if (OWNER_BY_SOURCE[s]) return OWNER_BY_SOURCE[s];
  }
  return null;
}

const num = (v) => (v === undefined || v === '' || v === null || isNaN(Number(v)) ? null : Number(v));
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const csv = (v) => (str(v) ? str(v).split(',').map((x) => x.trim()).filter(Boolean) : null);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.status(405).json({ error: 'Use GET' }); return; }

  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (!userCan(user, 'dbsearch')) { res.status(403).json({ error: 'You don’t have access to DB Search.' }); return; }
  if (!isNamingDbConfigured()) { res.status(500).json({ error: 'Naming universe not configured' }); return; }

  const p = req.query;
  const page = Math.max(0, num(p.page) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, num(p.limit) || 50));
  const from = page * limit;

  const sortCol = ({ domain: 'domain', price: 'best_price', source: 'best_price_source' })[p.sort] || 'domain';
  const ascending = (p.dir || 'asc') !== 'desc';

  let q = getNamingDb()
    .from(TABLE)
    .select('domain, sld, tld, sld_length, num_words, num_syllables, is_dictionary_word, best_price, best_price_source, sources, source_tier, category, emotions, keywords', { count: 'estimated' });

  // Free-text: match the SLD (fuzzy = contains anywhere; else prefix).
  const text = str(p.q);
  if (text) q = q.ilike('sld', (p.fuzzy === '1' ? '%' : '') + text.toLowerCase() + '%');

  const tlds = csv(p.tld);
  if (tlds) q = q.in('tld', tlds.map((t) => (t.startsWith('.') ? t.slice(1) : t)));

  const priceMin = num(p.price_min); if (priceMin != null) q = q.gte('best_price', priceMin);
  const priceMax = num(p.price_max); if (priceMax != null) q = q.lte('best_price', priceMax);

  const lenExact = num(p.len_exact);
  if (lenExact != null) q = q.eq('sld_length', lenExact);
  else {
    const lenMin = num(p.len_min); if (lenMin != null) q = q.gte('sld_length', lenMin);
    const lenMax = num(p.len_max); if (lenMax != null) q = q.lte('sld_length', lenMax);
  }

  // Single word: yes → exactly 1 word; no → 2+.
  if (p.single_word === 'yes') q = q.eq('num_words', 1);
  else if (p.single_word === 'no') q = q.gt('num_words', 1);

  if (p.dict_word === 'yes') q = q.eq('is_dictionary_word', true);
  else if (p.dict_word === 'no') q = q.eq('is_dictionary_word', false);

  const wordsMin = num(p.words_min); if (wordsMin != null) q = q.gte('num_words', wordsMin);
  const wordsMax = num(p.words_max); if (wordsMax != null) q = q.lte('num_words', wordsMax);

  // No numbers: SLD has no digit. PostgREST regex (~). Best-effort.
  if (p.no_numbers === '1') q = q.not('sld', 'match', '[0-9]');

  const sources = csv(p.source);
  if (sources) q = q.overlaps('sources', sources);

  const cats = csv(p.category);
  if (cats) q = q.in('category', cats);

  const emotions = csv(p.emotion);
  if (emotions) q = q.overlaps('emotions', emotions);

  // Keyword contains: try the enrichment keywords array; falls back to SLD.
  const kw = str(p.keyword);
  if (kw) q = q.or(`keywords.cs.{${kw.toLowerCase()}},sld.ilike.%${kw.toLowerCase()}%`);

  q = q.order(sortCol, { ascending, nullsFirst: false }).range(from, from + limit - 1);

  const { data, error, count } = await q;
  if (error) { res.status(500).json({ error: error.message }); return; }

  const ownerFilter = str(p.owner) ? str(p.owner).toLowerCase() : null;
  let rows = (data || []).map((r) => ({ ...r, owner: ownerFor(r.sources) }));
  if (ownerFilter) rows = rows.filter((r) => (r.owner || '').toLowerCase().includes(ownerFilter));

  res.status(200).json({ rows, page, limit, count: count ?? null, has_more: (data || []).length === limit });
}
