// Nameserver Search — read-only queries over the `zone_domains` table in the
// NAMING Supabase project (one row per domain: { domain, tld, nameservers[] },
// loaded from ICANN CZDS zone files; see snagged-admin scripts/zone_domains.sql).
//
// Two directions:
//   • domain  → its nameserver set            (lookupDomain)
//   • NS set  → the domains that use them      (domainsByNameservers; AND / OR)
//   • domain  → siblings sharing its EXACT NS pairing  (samePairing)
//
// The "same pairing" reverse lookup is the ownership-clue play: a domain on a
// uniquely-configured nameserver pair (e.g. two custom Cloudflare NS names) is
// very likely held by the same owner as everything else on that pair.
//
// Performance: reverse lookups lean on the GIN index over `nameservers`
// (idx_zone_domains_ns_gin). `.contains` = @> (has ALL = AND), `.overlaps` = &&
// (has ANY = OR). Results are capped + ordered by the `domain` primary key so
// pagination is stable and cheap.
import { getZoneDb, isZoneDbConfigured } from '../db/supabase-zone.js';

const TABLE = 'zone_domains';
export const MAX_LIMIT = 500;
export const DEFAULT_LIMIT = 200;

export function isConfigured() {
  return isZoneDbConfigured();
}

// The zone_domains table is loaded out-of-band (CZDS zone files → COPY). Until
// that's done, queries fail with a missing-relation / schema-cache error — detect
// it so the API can say "not loaded yet" instead of leaking a raw PostgREST error.
export function isNotLoadedError(error) {
  if (!error) return false;
  const code = error.code || '';
  const msg = String(error.message || '').toLowerCase();
  return code === 'PGRST205' || code === '42P01' ||
    msg.includes('schema cache') || msg.includes('does not exist');
}
function rethrow(error) {
  if (isNotLoadedError(error)) {
    const e = new Error('ZONE_NOT_LOADED');
    e.code = 'ZONE_NOT_LOADED';
    throw e;
  }
  throw new Error(error.message);
}

// Normalize a nameserver hostname the same way the loader does: lowercase, no
// trailing dot, trimmed. Returns '' for junk so callers can drop it.
export function normalizeNs(host) {
  return String(host || '').trim().toLowerCase().replace(/\.+$/, '');
}

// Parse a free-form NS input (comma / whitespace / newline separated) into a
// clean, de-duped list.
export function parseNsList(raw) {
  const seen = new Set();
  const out = [];
  for (const part of String(raw || '').split(/[\s,]+/)) {
    const ns = normalizeNs(part);
    if (ns && !seen.has(ns)) { seen.add(ns); out.push(ns); }
  }
  return out;
}

function clampLimit(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(v), MAX_LIMIT);
}

// domain → { domain, tld, nameservers[] } | null
export async function lookupDomain(domain) {
  const d = String(domain || '').trim().toLowerCase();
  if (!d) return null;
  const { data, error } = await getZoneDb()
    .from(TABLE)
    .select('domain, tld, nameservers')
    .eq('domain', d)
    .limit(1);
  if (error) rethrow(error);
  return (data && data[0]) || null;
}

// NS set → domains using them. mode 'all' = must have every NS (AND, @>);
// mode 'any' = has at least one (OR, &&). Optional bare-tld scope. Returns
// { rows, hasMore }.
export async function domainsByNameservers({ nameservers, mode = 'all', tld = '', limit, offset = 0 } = {}) {
  const ns = (nameservers || []).map(normalizeNs).filter(Boolean);
  if (!ns.length) return { rows: [], hasMore: false };
  const lim = clampLimit(limit);
  const off = Math.max(0, Number(offset) || 0);

  let q = getZoneDb().from(TABLE).select('domain, tld, nameservers');
  q = mode === 'any' ? q.overlaps('nameservers', ns) : q.contains('nameservers', ns);
  const t = String(tld || '').trim().toLowerCase().replace(/^\./, '');
  if (t) q = q.eq('tld', t);
  // Fetch one extra to detect a next page without a COUNT (which would scan).
  q = q.order('domain', { ascending: true }).range(off, off + lim);

  const { data, error } = await q;
  if (error) rethrow(error);
  const rows = data || [];
  const hasMore = rows.length > lim;
  return { rows: hasMore ? rows.slice(0, lim) : rows, hasMore };
}

// domain → other domains on its EXACT nameserver set (the pairing). Looks up the
// domain's NS first, then does an AND (@>) over that whole set, excluding the
// domain itself. Returns { domain, nameservers[], rows, hasMore }.
export async function samePairing(domain, { limit, offset = 0 } = {}) {
  const self = await lookupDomain(domain);
  if (!self || !Array.isArray(self.nameservers) || !self.nameservers.length) {
    return { domain: String(domain || '').toLowerCase(), nameservers: [], rows: [], hasMore: false, found: false };
  }
  const { rows, hasMore } = await domainsByNameservers({
    nameservers: self.nameservers,
    mode: 'all',
    limit,
    offset,
  });
  const filtered = rows.filter((r) => r.domain !== self.domain);
  return { domain: self.domain, tld: self.tld, nameservers: self.nameservers, rows: filtered, hasMore, found: true };
}
