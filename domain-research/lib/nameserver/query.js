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
import { runTool } from '../sources/index.js';
import { classifyPair } from './context.js';

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

// Some domains carry ephemeral verification / ACME-challenge NS records (e.g.
// `verification-wu7jp5iv...ns101.verify.hn`) that are unique per-domain and never
// shared. Including one in a pairing @> set guarantees zero siblings (no other
// domain has that exact token), so drop them before resolving the NS set.
export function isJunkNs(host) {
  return /(^|\.)verify\.|verification-|_acme|acme-challenge/i.test(String(host || ''));
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
  // zone_domains is LIST-partitioned by tld, so filtering on tld lets the planner
  // prune straight to the one partition instead of probing every partition's
  // domain index (the .com partition has 163M rows — a missed prune is a timeout).
  const dot = d.lastIndexOf('.');
  const tld = dot > 0 ? d.slice(dot + 1) : '';
  let q = getZoneDb().from(TABLE).select('domain, tld, nameservers').eq('domain', d);
  if (tld) q = q.eq('tld', tld);
  const { data, error } = await q.limit(1);
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
  // NO ORDER BY: sorting a huge @> match set (e.g. a shared host with millions of
  // hits) forces Postgres to collect + sort everything → statement timeout. A
  // bare LIMIT lets the GIN scan stop early and return fast; we sort the small
  // returned page in JS. Fetch one extra to detect a next page without a COUNT.
  q = q.range(off, off + lim);

  const { data, error } = await q;
  if (error) rethrow(error);
  const all = data || [];
  const hasMore = all.length > lim;
  const rows = (hasMore ? all.slice(0, lim) : all)
    .sort((a, b) => (a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0));
  return { rows, hasMore };
}

// Resolve a domain's nameservers LIVE (when it isn't in our zone index — e.g. a
// .com we haven't loaded). Live DNS NS records first (authoritative, fast), then
// the RDAP registry nameservers as a fallback (works even if DNS isn't resolving).
export async function liveNameservers(domain, env = process.env) {
  const d = String(domain || '').trim().toLowerCase();
  if (!d) return [];
  try {
    const r = await runTool('dns_lookup', { domain: d }, env);
    const ns = r && r.ok && Array.isArray(r.data && r.data.ns) ? r.data.ns : [];
    const clean = [...new Set(ns.map(normalizeNs).filter((h) => h && !isJunkNs(h)))];
    if (clean.length) return clean;
  } catch { /* fall through to RDAP */ }
  try {
    const r = await runTool('rdap_whois', { domain: d }, env);
    const arr = r && r.ok && Array.isArray(r.data && r.data.nameservers) ? r.data.nameservers : [];
    const clean = [...new Set(arr.map((n) => normalizeNs((n && (n.ldhName || n.name)) || '')).filter((h) => h && !isJunkNs(h)))];
    if (clean.length) return clean;
  } catch { /* give up */ }
  return [];
}

// A domain's nameservers from our zone index if present, else resolved live.
// Returns { nameservers[], source: 'zone' | 'live' | null, tld }.
export async function resolveNameservers(domain, env = process.env) {
  const row = await lookupDomain(domain);
  if (row && Array.isArray(row.nameservers) && row.nameservers.length) {
    return { nameservers: row.nameservers, source: 'zone', tld: row.tld || null };
  }
  const live = await liveNameservers(domain, env);
  return { nameservers: live, source: live.length ? 'live' : null, tld: null };
}

// domain → other domains on its EXACT nameserver set (the pairing). Gets the
// domain's NS from our index OR live, then does an AND (@>) over that whole set,
// excluding the domain itself. Returns { domain, nameservers[], rows, hasMore,
// source }. Works even when the domain/TLD isn't loaded (source 'live').
export async function samePairing(domain, { limit, offset = 0, env = process.env } = {}) {
  const self = String(domain || '').toLowerCase();
  const { nameservers, source } = await resolveNameservers(self, env);
  if (!nameservers.length) {
    return { domain: self, nameservers: [], rows: [], hasMore: false, found: false, source, pair: null };
  }
  const pair = classifyPair(nameservers);
  // Generic parking/registrar nameservers are shared by millions of unrelated
  // domains — the reverse query would just time out and mean nothing. Don't run
  // it; tell the caller it's generic.
  if (pair.generic) {
    return { domain: self, nameservers, rows: [], hasMore: false, found: true, source, pair, tooGeneric: true };
  }
  const { rows, hasMore } = await domainsByNameservers({ nameservers, mode: 'all', limit, offset });
  const filtered = rows.filter((r) => r.domain !== self);
  return { domain: self, nameservers, rows: filtered, hasMore, found: true, source, pair };
}
