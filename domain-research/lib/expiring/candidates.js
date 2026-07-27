// Curate the Expiring .ai watchlist from OUR DICTIONARY, not the zone file.
//
// Why not the zone: a name in redemption/pending-delete has been REMOVED from the
// .ai zone (its delegation is pulled when it lapses), so curating candidates from
// zone_domains structurally misses exactly the names this report exists to find
// (e.g. rica.ai / dealt.ai — expired, in redemption, gone from the zone). Instead
// we enumerate good one-word dictionary words → `<word>.ai` and let the RDAP scan
// discover each name's real status (registered / expiration / redemption / dropped)
// and nameservers. That's independent of the zone snapshot and catches names
// already in the window.
//
// Keyset-paged over english_words (the naming project's dictionary) so each cron
// tick inserts a bounded slice; wraps at the end (picks up dictionary growth).
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
// time (from the RDAP nameservers), since curation no longer reads the zone.
export function looksParked(nameservers) {
  return Boolean(classifyPair(nameservers || []).generic);
}

// Process one keyset slice of the dictionary. Returns { scanned, kept, cursor, wrapped }.
export async function curateSlice({ pageSize = 3000 } = {}) {
  if (!isNamingDbConfigured()) return { scanned: 0, kept: 0, cursor: '', wrapped: false, configured: false };
  const cursor = await getCursor();
  let q = getNamingDb()
    .from('english_words')
    .select('word')
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
  let last = cursor;
  for (const r of rows) {
    last = r.word;                       // advance the cursor even for skipped words
    const sld = candidateSld(r.word);
    if (!sld) continue;
    // parked unknown until the scan reads the live nameservers; NS captured then.
    const inserted = await insertCandidate({ domain: `${sld}.ai`, sld, nameservers: [], parked: false });
    if (inserted) kept++;
  }

  await setCursor(last);
  return { scanned: rows.length, kept, cursor: last, wrapped: false, configured: true };
}
