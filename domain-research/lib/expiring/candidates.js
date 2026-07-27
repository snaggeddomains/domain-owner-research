// Curate the Expiring .ai watchlist from OUR DICTIONARY. Enumerate good one-word
// `is_root` words → `<word>.ai` and insert them as candidates. NO per-word DNS work
// here — the demand/quality check is deferred to the moment a name actually reaches
// redemption (see scan.js), so curation is fast and the only bulk lookup is a plain
// RDAP call per .ai. (An earlier version ran a ~26-TLD DNS probe on every word here;
// slow resolvers made each word take seconds and blew the 60s function budget — Rob's
// "can't we just use basic RDAP?" fix.)
//
// Why the dictionary and not the zone: a name in redemption has been REMOVED from the
// .ai zone (delegation pulled when it lapses), so the zone structurally misses exactly
// the names we want. We build our own candidate universe from the dictionary and let
// RDAP discover each name's real status.
//
// Keyset-paged over english_words (is_root only → drops plurals/inflections) so each
// cron tick inserts a bounded slice; wraps at the end.
import { getNamingDb, isNamingDbConfigured } from '../db/supabase-naming.js';
import { classifyPair } from '../nameserver/context.js';
import { insertCandidate, getCursor, setCursor } from '../db/expiringAi.js';

const MIN_LEN = Number(process.env.EXPIRING_AI_MIN_LEN || 3);
const MAX_LEN = Number(process.env.EXPIRING_AI_MAX_LEN || 12);
const ONE_WORD = /^[a-z]+$/;

// A dictionary word → its clean one-word SLD if it qualifies, else null.
export function candidateSld(word) {
  const w = String(word || '').toLowerCase().trim();
  if (!ONE_WORD.test(w)) return null;
  if (w.length < MIN_LEN || w.length > MAX_LEN) return null;
  return w;
}

// Does this nameserver set look like a parking/marketplace host (likely a domain
// investor)? Reuses the Nameserver Search generic-host classifier. Used at SCAN
// time (from the RDAP nameservers).
export function looksParked(nameservers) {
  return Boolean(classifyPair(nameservers || []).generic);
}

// Process one keyset slice of the dictionary. Pure DB work (no DNS), so the slice can
// be large. Returns { scanned, kept, cursor, wrapped }.
export async function curateSlice({ pageSize = 1500 } = {}) {
  if (!isNamingDbConfigured()) return { scanned: 0, kept: 0, cursor: '', wrapped: false, configured: false };
  const cursor = await getCursor();
  // is_root = true drops plurals/inflections (croatias, boxes) — we watch the base word.
  let q = getNamingDb()
    .from('english_words')
    .select('word')
    .eq('is_root', true)
    .order('word', { ascending: true })
    .limit(pageSize);
  if (cursor) q = q.gt('word', cursor);
  const { data, error } = await q;
  if (error) return { scanned: 0, kept: 0, cursor, wrapped: false, configured: true, error: error.message };

  const rows = data || [];
  // End of the dictionary → wrap to the start next tick.
  if (!rows.length) {
    await setCursor('');
    return { scanned: 0, kept: 0, cursor: '', wrapped: true, configured: true };
  }

  let kept = 0;
  for (const r of rows) {
    const sld = candidateSld(r.word);
    if (!sld) continue;
    const inserted = await insertCandidate({ domain: `${sld}.ai`, sld, nameservers: [], parked: false });
    if (inserted) kept++;
  }

  await setCursor(rows[rows.length - 1].word);
  return { scanned: rows.length, kept, cursor: rows[rows.length - 1].word, wrapped: false, configured: true };
}
