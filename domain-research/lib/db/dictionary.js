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
