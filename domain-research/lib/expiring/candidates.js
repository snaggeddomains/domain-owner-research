// Curate the Expiring .ai watchlist: walk the .ai zone index in keyset slices and
// keep only GOOD one-word dictionary .ai names — dropping numbers/hyphens, the
// wrong length, non-dictionary SLDs, and parking/marketplace-nameserver names
// (the domain-investor tell Sam wants us to avoid). Survivors are upserted as
// candidates; the scan layer then learns each one's expiration + watches for the
// redemption drop.
//
// Cursor-paged over zone_domains (tld='ai') so each cron tick advances a bounded
// slice; when we reach the end we wrap to the start (picks up newly-loaded rows).
import { getZoneDb, isZoneDbConfigured } from '../db/supabase-zone.js';
import { filterDictionaryWords } from '../db/dictionary.js';
import { classifyPair } from '../nameserver/context.js';
import { insertCandidate, getCursor, setCursor } from '../db/expiringAi.js';

const MIN_LEN = Number(process.env.EXPIRING_AI_MIN_LEN || 3);
const MAX_LEN = Number(process.env.EXPIRING_AI_MAX_LEN || 12);
const ONE_WORD = /^[a-z]+$/;

// A zone .ai domain → its SLD if it's a clean one-word candidate, else null.
export function candidateSld(domain) {
  const d = String(domain || '').toLowerCase().trim();
  if (!d.endsWith('.ai')) return null;
  const sld = d.slice(0, -3);
  if (!ONE_WORD.test(sld)) return null;
  if (sld.length < MIN_LEN || sld.length > MAX_LEN) return null;
  return sld;
}

// Does this nameserver set look like a parking/marketplace host (likely a domain
// investor)? Reuses the Nameserver Search generic-host classifier.
export function looksParked(nameservers) {
  return Boolean(classifyPair(nameservers || []).generic);
}

// Process one keyset slice of the .ai zone. Returns { scanned, kept, cursor, wrapped }.
export async function curateSlice({ pageSize = 2000 } = {}) {
  if (!isZoneDbConfigured()) return { scanned: 0, kept: 0, cursor: '', wrapped: false, configured: false };
  const cursor = await getCursor();
  let q = getZoneDb()
    .from('zone_domains')
    .select('domain, nameservers')
    .eq('tld', 'ai')
    .order('domain', { ascending: true })
    .limit(pageSize);
  if (cursor) q = q.gt('domain', cursor);
  const { data, error } = await q;
  if (error) return { scanned: 0, kept: 0, cursor, wrapped: false, configured: true, error: error.message };

  const rows = data || [];
  // End of the zone → wrap to the start next tick (catches newly-loaded names).
  if (!rows.length) {
    await setCursor('');
    return { scanned: 0, kept: 0, cursor: '', wrapped: true, configured: true };
  }

  // Shape one-word candidates; batch the dictionary check.
  const shaped = [];
  for (const r of rows) {
    const sld = candidateSld(r.domain);
    if (sld) shaped.push({ domain: String(r.domain).toLowerCase(), sld, nameservers: r.nameservers || [] });
  }
  const dict = await filterDictionaryWords(shaped.map((s) => s.sld));

  let kept = 0;
  for (const s of shaped) {
    if (!dict.has(s.sld)) continue;
    const parked = looksParked(s.nameservers);
    const inserted = await insertCandidate({ domain: s.domain, sld: s.sld, nameservers: s.nameservers, parked });
    if (inserted) kept++;
  }

  const last = rows[rows.length - 1].domain;
  await setCursor(last);
  return { scanned: rows.length, kept, cursor: last, wrapped: false, configured: true };
}
