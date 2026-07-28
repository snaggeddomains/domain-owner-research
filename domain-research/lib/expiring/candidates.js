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
import { insertCandidate, upsertTechCandidates, getCursor, setCursor } from '../db/expiringAi.js';
import { techScore, techLexiconRows, TECH_VERSION } from './techTerms.js';

const MIN_LEN = Number(process.env.EXPIRING_AI_MIN_LEN || 3);
const MAX_LEN = Number(process.env.EXPIRING_AI_MAX_LEN || 12);
const ONE_WORD = /^[a-z]+$/;

// name_universe categories that read as tech/AI/science — the demand profile that
// actually matches the .ai TLD (mirrors the controlled CATEGORIES list in the pipeline).
const TECH_CATEGORIES = ['Technology & Software', 'Internet & Web', 'AI & Data', 'Crypto & Web3', 'Science & Research'];

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
    // Tech-relevant dictionary words get scan priority (2) so they surface first.
    const inserted = await insertCandidate({ domain: `${sld}.ai`, sld, nameservers: [], parked: false, priority: techScore(sld) });
    if (inserted) kept++;
  }

  await setCursor(rows[rows.length - 1].word);
  return { scanned: rows.length, kept, cursor: rows[rows.length - 1].word, wrapped: false, configured: true };
}

// Seed the curated AI/tech lexicon: adds terms not in the dictionary as new `<term>.ai`
// candidates AND lifts existing dictionary rows to priority 2 (so tech names scan first).
// Version-gated (only runs when the committed lexicon changes) so the cron isn't
// re-upserting ~300 rows every tick. Fail-open.
export async function seedTechLexicon() {
  const stored = await getCursor('ai_tech_lexicon_v');   // no-ops → '' if the research DB is unconfigured
  if (String(stored) === String(TECH_VERSION)) return { seeded: 0, skipped: true };
  const rows = techLexiconRows();
  const written = await upsertTechCandidates(rows);
  if (written) await setCursor(String(TECH_VERSION), 'ai_tech_lexicon_v');
  return { seeded: written, version: TECH_VERSION };
}

// EXPAND toward the TLD: pull single-word tech/AI-category SLDs from name_universe (same
// project as english_words) and seed them as priority-2 `<sld>.ai` candidates — tech
// names people actually value that a general dictionary misses. Keyset-paged over its own
// cursor; BEST-EFFORT + fail-open. NB name_universe has no (category, sld) index today, so
// this query can hit the statement timeout on that huge table → it simply no-ops until an
// index exists: `create index on name_universe (category, sld);` on the naming project.
export async function curateTechUniverse({ pageSize = 300 } = {}) {
  if (!isNamingDbConfigured()) return { scanned: 0, kept: 0, configured: false };
  const cursor = await getCursor('ai_tech_cursor');
  let q = getNamingDb()
    .from('name_universe')
    .select('sld,category')
    .in('category', TECH_CATEGORIES)
    .order('sld', { ascending: true })
    .limit(pageSize);
  if (cursor) q = q.gt('sld', cursor);
  let data, error;
  try { ({ data, error } = await q); } catch (e) { error = e; }
  if (error) return { scanned: 0, kept: 0, configured: true, error: String((error && error.message) || error) };
  const rows = data || [];
  if (!rows.length) { await setCursor('', 'ai_tech_cursor'); return { scanned: 0, kept: 0, wrapped: true, configured: true }; }
  // Clean one-word SLDs only, deduped → priority-2 candidates.
  const seen = new Set();
  const cand = [];
  for (const r of rows) {
    const sld = candidateSld(r.sld);
    if (!sld || seen.has(sld)) continue;
    seen.add(sld);
    cand.push({ domain: `${sld}.ai`, sld, priority: 2 });
  }
  const kept = cand.length ? await upsertTechCandidates(cand) : 0;
  await setCursor(rows[rows.length - 1].sld, 'ai_tech_cursor');
  return { scanned: rows.length, kept, cursor: rows[rows.length - 1].sld, configured: true };
}
