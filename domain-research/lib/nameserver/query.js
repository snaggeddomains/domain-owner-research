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
import { fetchJson } from '../util.js';
import { classifyPair } from './context.js';

const TABLE = 'zone_domains';
export const MAX_LIMIT = 500;
export const DEFAULT_LIMIT = 200;
// A single big page for CSV export ("get everything"). Selective pairings return
// far fewer; the GIN scan stops at this cap (a generic host that would blow past
// it is short-circuited upstream, so this never runs on a millions-row match).
export const EXPORT_MAX = 50000;

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

function clampLimit(n, max = MAX_LIMIT) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(v), max);
}

// domain → { domain, tld, nameservers[] } | null
// A hung/paused zone DB (its own Supabase project) must NOT hang the whole request —
// supabase-js has no query timeout, so a stalled connection would run the function to its
// 60s limit → a non-JSON 504 the client can't parse. Race every zone query against a short
// deadline so callers can fail fast (and, for a plain domain lookup, fall back to live DNS).
const ZONE_TIMEOUT_MS = 7000;
function zoneRace(promise, ms = ZONE_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('zone_db_timeout')), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

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
  const { data, error } = await zoneRace(q.limit(1));
  if (error) rethrow(error);
  return (data && data[0]) || null;
}

// NS set → domains using them. mode 'all' = must have every NS (AND, @>);
// mode 'any' = has at least one (OR, &&). Optional bare-tld scope. Returns
// { rows, hasMore }.
export async function domainsByNameservers({ nameservers, mode = 'all', tld = '', limit, offset = 0, max } = {}) {
  const ns = (nameservers || []).map(normalizeNs).filter(Boolean);
  if (!ns.length) return { rows: [], hasMore: false };
  const lim = clampLimit(limit, max);
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

  const { data, error } = await zoneRace(q);
  if (error) rethrow(error);
  const all = data || [];
  const hasMore = all.length > lim;
  const rows = (hasMore ? all.slice(0, lim) : all)
    .sort((a, b) => (a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0));
  return { rows, hasMore };
}

// TLD breakdown for an NS match — powers the post-results "filter to a TLD" bar
// (a custom NS pair returns mostly .com, but you want to narrow to the 47 .vc
// names on it; for a small TLD that correlation is the ownership signal). Backed
// by the ns_tld_counts RPC (a group-by-count with an internal 5s statement_timeout),
// so it's exact for a selective nameserver and bows out gracefully (→ []) on a
// huge shared host where a full count would be slow. [{ tld, count }] desc; never
// throws — no facet bar is a fine degradation.
export async function nsTldFacets({ nameservers, mode = 'all' } = {}) {
  const ns = (nameservers || []).map(normalizeNs).filter(Boolean);
  if (!ns.length) return [];
  try {
    const { data, error } = await zoneRace(getZoneDb()
      .rpc('ns_tld_counts', { p_ns: ns, p_match: mode === 'any' ? 'any' : 'all' }));
    if (error) return [];
    return (data || []).map((r) => ({ tld: r.tld, count: Number(r.n) || 0 })).filter((x) => x.tld);
  } catch {
    return [];
  }
}

// IANA's RDAP bootstrap maps each TLD to its authoritative registry RDAP base
// URL. rdap.org is a convenience aggregator that mishandles some TLDs (e.g. it
// 404s `.io`, whose registry endpoint rdap.identitydigital.services answers
// fine), so when rdap.org fails we resolve the real base ourselves and query it
// directly. Cached at module scope — the bootstrap file changes rarely.
// ccTLDs that operate an RDAP server but DON'T register it in IANA's bootstrap
// (the bootstrap only requires gTLDs). Without these the bootstrap lookup returns
// nothing for them — e.g. `.io` is backed by Identity Digital but absent from
// dns.json. Bases are the RDAP root (we append `domain/<d>`).
const CCTLD_RDAP = {
  io: 'https://rdap.identitydigital.services/rdap',
  sh: 'https://rdap.identitydigital.services/rdap',
  ac: 'https://rdap.identitydigital.services/rdap',
};
let _rdapBootstrap = null;
async function rdapBaseForTld(tld) {
  const t = String(tld || '').toLowerCase();
  if (!t) return null;
  if (CCTLD_RDAP[t]) return CCTLD_RDAP[t];
  if (!_rdapBootstrap) {
    _rdapBootstrap = (async () => {
      const m = new Map();
      const j = await fetchJson('https://data.iana.org/rdap/dns.json');
      for (const svc of (j && j.services) || []) {
        const tlds = svc[0] || [];
        const urls = svc[1] || [];
        const base = urls.find((u) => /^https:/i.test(u)) || urls[0];
        if (base) for (const x of tlds) m.set(String(x).toLowerCase(), base.replace(/\/+$/, ''));
      }
      return m;
    })().catch(() => new Map());
  }
  return (await _rdapBootstrap).get(t) || null;
}

// Pull a domain's delegation nameservers straight from its registry RDAP, via
// the IANA bootstrap. Works for TLDs rdap.org can't bootstrap.
async function registryRdapNameservers(domain) {
  const d = String(domain || '').toLowerCase();
  const dot = d.lastIndexOf('.');
  const base = await rdapBaseForTld(dot > 0 ? d.slice(dot + 1) : '');
  if (!base) return [];
  try {
    const j = await fetchJson(`${base}/domain/${encodeURIComponent(d)}`);
    const arr = Array.isArray(j && j.nameservers) ? j.nameservers : [];
    return [...new Set(arr.map((n) => normalizeNs((n && (n.ldhName || n.name)) || '')).filter((h) => h && !isJunkNs(h)))];
  } catch { return []; }
}

// Resolve a domain's nameservers LIVE (when it isn't in our zone index — e.g. a
// .com we haven't loaded). Live DNS NS records first (authoritative, fast), then
// RDAP via rdap.org, then the authoritative registry RDAP via IANA bootstrap (a
// last resort for TLDs/domains the first two miss — e.g. a SERVFAIL .io whose
// registry still publishes the delegation).
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
  } catch { /* fall through to registry RDAP */ }
  try {
    const clean = await registryRdapNameservers(d);
    if (clean.length) return clean;
  } catch { /* give up */ }
  return [];
}

// A domain's nameservers from our zone index if present, else resolved live.
// Returns { nameservers[], source: 'live' | 'zone' | null, tld }.
export async function resolveNameservers(domain, env = process.env) {
  // LIVE is authoritative + FRESH for a single domain's own NS. The zone index is a
  // point-in-time CZDS snapshot that goes STALE the moment a domain changes nameservers
  // (e.g. stuut.com moving to Cloudflare after the load — the index still shows its old
  // parking NS). So resolve live FIRST and fall back to the (possibly stale) index only
  // when live can't resolve at all. The index's real job is the REVERSE lookup (NS →
  // domains), which can't be done live. Also: live is independent of the zone DB, so a
  // paused/down zone project no longer breaks a plain lookup.
  const d = String(domain || '').toLowerCase();
  const dot = d.lastIndexOf('.');
  const tld = dot > 0 ? d.slice(dot + 1) : null;
  const live = await liveNameservers(d, env);
  if (live.length) return { nameservers: live, source: 'live', tld };
  let row = null;
  try { row = await lookupDomain(d); } catch { row = null; }
  if (row && Array.isArray(row.nameservers) && row.nameservers.length) {
    return { nameservers: row.nameservers, source: 'zone', tld: row.tld || tld };
  }
  return { nameservers: [], source: null, tld };
}

// domain → other domains on its EXACT nameserver set (the pairing). Gets the
// domain's NS from our index OR live, then does an AND (@>) over that whole set,
// excluding the domain itself. Returns { domain, nameservers[], rows, hasMore,
// source }. Works even when the domain/TLD isn't loaded (source 'live').
export async function samePairing(domain, { limit, offset = 0, tld = '', max, env = process.env } = {}) {
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
  const t = String(tld || '').trim().toLowerCase().replace(/^\./, '');
  const { rows, hasMore } = await domainsByNameservers({ nameservers, mode: 'all', tld: t, limit, offset, max });
  const filtered = rows.filter((r) => r.domain !== self);
  // Facet the pairing by TLD (unfiltered view only) so the UI can narrow the
  // siblings to one TLD — the small-TLD names on a custom pair are the signal.
  const tlds = t ? undefined : await nsTldFacets({ nameservers, mode: 'all' });
  return { domain: self, nameservers, rows: filtered, hasMore, found: true, source, pair, tld: t || null, ...(tlds ? { tlds } : {}) };
}
