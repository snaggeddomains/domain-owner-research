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
import { popularTldCount } from '../evaluate/tldcount.js';
import { insertCandidate, getCursor, setCursor } from '../db/expiringAi.js';

const MIN_LEN = Number(process.env.EXPIRING_AI_MIN_LEN || 3);
const MAX_LEN = Number(process.env.EXPIRING_AI_MAX_LEN || 12);
// Quality gate: a word must be registered in at least this many of the ~26 most
// popular TLDs to be watched — proven cross-TLD demand, so we don't RDAP-poll tens
// of thousands of obscure Scrabble words. Tunable (Rob: "more than 5 or 10 TLDs").
const MIN_TLDS = Number(process.env.EXPIRING_AI_MIN_TLDS || 6);
const GATE_CONCURRENCY = Number(process.env.EXPIRING_AI_GATE_CONCURRENCY || 6);
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

// Process one keyset slice of the dictionary. Each candidate word is quality-gated
// by its popular-TLD demand count (≥ MIN_TLDS) before it's inserted, so obscure
// Scrabble words never enter the watchlist. pageSize is small because the gate does
// DNS. Returns { scanned, kept, gated, cursor, wrapped }.
export async function curateSlice({ pageSize = 150, minTlds = MIN_TLDS } = {}) {
  if (!isNamingDbConfigured()) return { scanned: 0, kept: 0, gated: 0, cursor: '', wrapped: false, configured: false };
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
  if (error) return { scanned: 0, kept: 0, gated: 0, cursor, wrapped: false, configured: true, error: error.message };

  const rows = data || [];
  // End of the dictionary → wrap to the start next tick.
  if (!rows.length) {
    await setCursor('');
    return { scanned: 0, kept: 0, gated: 0, cursor: '', wrapped: true, configured: true };
  }

  const words = rows.map((r) => candidateSld(r.word)).filter(Boolean);
  let kept = 0, gated = 0;
  // Gate the slice's words with bounded concurrency (each gate is a cache-first DNS
  // probe of ~26 TLDs). A word clearing the demand bar is inserted as a candidate.
  const queue = [...words];
  async function worker() {
    while (queue.length) {
      const sld = queue.shift();
      let count = 0;
      try { count = (await popularTldCount(sld, { env: process.env, minTlds })).count || 0; } catch { count = 0; }
      gated++;
      if (count < minTlds) continue;    // obscure word — not worth watching
      // parked unknown until the scan reads the live nameservers; NS captured then.
      const inserted = await insertCandidate({ domain: `${sld}.ai`, sld, nameservers: [], parked: false, tldCount: count });
      if (inserted) kept++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(GATE_CONCURRENCY, words.length) || 1 }, worker));

  await setCursor(rows[rows.length - 1].word);
  return { scanned: rows.length, kept, gated, cursor: rows[rows.length - 1].word, wrapped: false, configured: true };
}
