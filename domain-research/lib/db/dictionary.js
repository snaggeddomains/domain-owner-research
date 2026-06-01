import { getNamingDb, isNamingDbConfigured } from './supabase-naming.js';

// Look up a single SLD's dictionary entry in english_words.definition (JSONB).
// Returns the parsed object (phonetic + senses + source + fetched_at), or
// null when the word isn't in our dictionary or hasn't been backfilled yet.
// Read-only, hot-path safe — single indexed lookup on the primary key.
//
// Fail-open: if the naming-universe DB isn't configured (e.g. local dev
// without the env vars set) or the query errors, return null. Definitions
// are decorative context, never load-bearing for any business logic.
export async function getDefinition(word) {
  if (!isNamingDbConfigured()) return null;
  const w = String(word || '').toLowerCase().trim();
  if (!w || !/^[a-z]+$/.test(w)) return null;
  try {
    const { data, error } = await getNamingDb()
      .from('english_words')
      .select('word, is_root, pos, definition')
      .eq('word', w)
      .maybeSingle();
    if (error || !data) return null;
    if (!data.definition) return null;
    return data.definition;
  } catch {
    return null;
  }
}

// Extract the SLD (the part before the first dot) from a domain string.
// Lowercased, ASCII-only validation — anything weird returns null so the
// caller falls through to "no definition available" without an error.
export function sldOf(domain) {
  const d = String(domain || '').toLowerCase().trim();
  if (!d) return null;
  const dot = d.indexOf('.');
  const sld = dot > 0 ? d.slice(0, dot) : d;
  return /^[a-z]+$/.test(sld) ? sld : null;
}

// ── Live fallback ───────────────────────────────────────────────────────────
// The backfill only fills definitions for words that already EXIST in
// english_words; it doesn't add new words. So a perfectly common word (donkey,
// descale) may simply have no row — and the Definition block stays empty. Fall
// back to the same free dictionary API the backfill uses, shaped identically,
// so any real word resolves. Fail-open + decorative, never blocks the appraisal.
const DICT_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const MAX_SENSES = 2;
const MAX_DEFS_PER_SENSE = 2;

function shapeLive(apiResponse) {
  if (!Array.isArray(apiResponse) || !apiResponse.length) return null;
  const first = apiResponse[0] || {};
  const phonetic =
    (typeof first.phonetic === 'string' && first.phonetic) ||
    (Array.isArray(first.phonetics) && (first.phonetics.find((p) => p && p.text) || {}).text) ||
    null;
  const meanings = Array.isArray(first.meanings) ? first.meanings : [];
  const senses = [];
  for (const m of meanings) {
    if (!m || !Array.isArray(m.definitions) || !m.definitions.length) continue;
    const defs = m.definitions
      .map((d) => (d && typeof d.definition === 'string' ? d.definition.trim() : ''))
      .filter(Boolean)
      .slice(0, MAX_DEFS_PER_SENSE);
    if (!defs.length) continue;
    senses.push({ pos: String(m.partOfSpeech || '').trim() || null, defs });
    if (senses.length >= MAX_SENSES) break;
  }
  if (!senses.length) return null;
  return { phonetic, senses, source: 'wiktionary', fetched_at: new Date().toISOString() };
}

export async function fetchLiveDefinition(word) {
  const w = String(word || '').toLowerCase().trim();
  if (!w || !/^[a-z]+$/.test(w)) return null;
  try {
    const res = await fetch(`${DICT_API}/${encodeURIComponent(w)}`, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    return shapeLive(await res.json());
  } catch {
    return null;
  }
}

// DB-first, live fallback: prefer the backfilled english_words row; if it has no
// usable entry, fetch live. Returns a definition object or null (fail-open).
export async function getDefinitionWithFallback(word) {
  const db = await getDefinition(word);
  if (db && Array.isArray(db.senses) && db.senses.length) return db;
  return fetchLiveDefinition(word);
}
