// "Registered in N TLDs" — a DotDB-style demand signal, built free. For a keyword/SLD
// we probe every IANA TLD (distribute.<tld>) for nameservers; NS present = registered.
// One query per TLD, fanned out across ~1,590 different registry authoritatives, so no
// single server is hammered (no meaningful rate-limit risk). Cached per SLD.
//
// Source is pluggable: if DOTDB_API_KEY is set we use DotDB's exact count; otherwise the
// free in-house DNS sweep (lands within a few of DotDB for real words).

import { Resolver } from 'node:dns/promises';
import { getToolLookup, saveToolLookup } from '../db/tools.js';
import { fetchJson } from '../util.js';

const IANA_URL = 'https://data.iana.org/TLD/tlds-alpha-by-domain.txt';
const KIND = 'tc'; // tool_lookups cache kind
const CONCURRENCY = 40;
const QUERY_TIMEOUT_MS = 3500;
// Public resolvers round-robined so no single recursive resolver takes the whole sweep.
const RESOLVER_SETS = [null, ['1.1.1.1', '1.0.0.1'], ['8.8.8.8', '8.8.4.4'], ['9.9.9.9', '149.112.112.112']];

let tldCache = null; // { list: string[], exp: number }

/** The full IANA TLD list (lowercased, punycode kept), cached ~24h. Fallback: a small
 *  liquid set if the fetch fails, so the tool still returns a (partial) number. */
async function ianaTlds() {
  if (tldCache && tldCache.exp > Date.now()) return tldCache.list;
  try {
    const res = await fetch(IANA_URL, { headers: { 'user-agent': 'snagged-research/1.0' } });
    if (res.ok) {
      const txt = await res.text();
      const list = txt.split('\n').map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith('#'));
      if (list.length > 100) { tldCache = { list, exp: Date.now() + 24 * 3600_000 }; return list; }
    }
  } catch { /* fall through */ }
  const fallback = 'com net org io co ai app dev xyz me us biz info online site tech store shop de uk co.uk fr es it nl eu ca cn top in au'.split(' ');
  tldCache = { list: fallback, exp: Date.now() + 3600_000 };
  return fallback;
}

function resolverFor(i) {
  const r = new Resolver({ timeout: QUERY_TIMEOUT_MS, tries: 1 });
  const servers = RESOLVER_SETS[i % RESOLVER_SETS.length];
  if (servers) { try { r.setServers(servers); } catch { /* keep default */ } }
  return r;
}

// registered = the zone has nameservers. ENOTFOUND / NXDOMAIN = available. Other errors
// (SERVFAIL/timeout/refused on restricted or flaky TLDs) → treat as "not registered"
// (they're not registerable-to-us anyway), so the count stays conservative.
async function isRegistered(resolver, host) {
  try {
    const ns = await resolver.resolveNs(host);
    return Array.isArray(ns) && ns.length > 0;
  } catch (e) {
    const code = e?.code || '';
    if (code === 'ENODATA') {
      // No NS but the name may still resolve (rare) — a quick A check.
      try { const a = await resolver.resolve4(host); return Array.isArray(a) && a.length > 0; } catch { return false; }
    }
    return false;
  }
}

/** Normalize input to a bare SLD label (accepts "distribute" or "distribute.com"). */
export function toSld(input) {
  return String(input || '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split('.')[0].replace(/[^a-z0-9-]/g, '');
}

async function dotdbCount(sld, env) {
  const key = env.DOTDB_API_KEY;
  if (!key) return null;
  try {
    // Best-effort DotDB API shape; if it changes, we fall back to the DNS sweep.
    const j = await fetchJson(`https://api.dotdb.com/v1/search?keyword=${encodeURIComponent(sld)}&type=exact`, { headers: { Authorization: `Bearer ${key}` } }, 15000);
    const count = Number(j?.exact_match ?? j?.exactMatch ?? j?.count);
    if (Number.isFinite(count)) return { sld, count, extensions: j?.extensions || [], active: j?.active ?? null, checked: null, source: 'dotdb' };
  } catch { /* fall through to DNS */ }
  return null;
}

/**
 * Count the TLDs where `input` is registered. Cache-first (kind 'tc' by SLD); refresh
 * to force. Returns { sld, count, extensions[], active, checked, source }.
 */
export async function countRegistrations(input, { env = process.env, refresh = false } = {}) {
  const sld = toSld(input);
  if (!sld) return { sld: '', count: 0, extensions: [], active: null, checked: 0, source: 'none' };

  if (!refresh) {
    const cached = await getToolLookup(KIND, sld);
    if (cached?.data && Number.isFinite(cached.data.count)) return cached.data;
  }

  const viaDotdb = await dotdbCount(sld, env);
  if (viaDotdb) { await saveToolLookup(KIND, sld, viaDotdb).catch(() => {}); return viaDotdb; }

  const tlds = await ianaTlds();
  const registered = [];
  let idx = 0;
  async function worker(wi) {
    const resolver = resolverFor(wi);
    while (idx < tlds.length) {
      const tld = tlds[idx++];
      if (await isRegistered(resolver, `${sld}.${tld}`)) registered.push(tld);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tlds.length) }, (_, i) => worker(i)));

  registered.sort((a, b) => (a === 'com' ? -1 : b === 'com' ? 1 : a.length - b.length || a.localeCompare(b)));
  const result = { sld, count: registered.length, extensions: registered, active: null, checked: tlds.length, source: 'dns' };
  await saveToolLookup(KIND, sld, result).catch(() => {});
  return result;
}
