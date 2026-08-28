// SNAP Research curation — seed <word>.com candidate rows from the dictionary. Alphabetical
// keyset walk over english_words (is_root only → base words, no plurals/inflections); each row
// carries its zipf (word frequency) so the SCAN can prioritise most-common-first. Pure DB work
// (no per-word lookups) so a slice is large and the ~98k seed completes in a few hours; the slow
// enrichment then runs zipf-ordered over the seeded pool.

import { getNamingDb, isNamingDbConfigured } from '../db/supabase-naming.js';
import { insertSnapCandidates, getCursor, setCursor } from '../db/snapResearch.js';

const MIN_LEN = Number(process.env.SNAP_RESEARCH_MIN_LEN) || 3;
const MAX_LEN = Number(process.env.SNAP_RESEARCH_MAX_LEN) || 15;

function candidateSld(word) {
  const w = String(word || '').toLowerCase().trim();
  if (!/^[a-z]+$/.test(w)) return null;                 // letters only — one clean word
  if (w.length < MIN_LEN || w.length > MAX_LEN) return null;
  return w;
}

export async function curateSlice({ pageSize = 1500 } = {}) {
  if (!isNamingDbConfigured()) return { scanned: 0, kept: 0, configured: false };
  const cursor = await getCursor();
  let q = getNamingDb()
    .from('english_words')
    .select('word,zipf')
    .eq('is_root', true)
    .order('word', { ascending: true })
    .limit(pageSize);
  if (cursor) q = q.gt('word', cursor);
  const { data, error } = await q;
  if (error) return { scanned: 0, kept: 0, configured: true, error: error.message };

  const rows = data || [];
  if (!rows.length) { await setCursor(''); return { scanned: 0, kept: 0, wrapped: true, configured: true }; }

  const cands = [];
  for (const r of rows) {
    const sld = candidateSld(r.word);
    if (!sld) continue;
    cands.push({ domain: `${sld}.com`, word: sld, zipf: r.zipf ?? null, wlen: sld.length });
  }
  const kept = await insertSnapCandidates(cands);
  await setCursor(rows[rows.length - 1].word);
  return { scanned: rows.length, kept, cursor: rows[rows.length - 1].word, configured: true };
}
