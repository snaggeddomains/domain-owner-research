// Beeper RDAP status checker. Hits the FREE RDAP API to read a domain's current
// status (e.g. "pending delete", "redemption period") and detect the moment it
// DROPS (becomes available). Registry RDAP first (authoritative — e.g. PANDI for
// .id, where rdap.org times out), then rdap.org as a fallback. No key, no cost.

import { fetchJson } from '../util.js';

// ccTLDs that run RDAP but aren't in IANA's gTLD bootstrap (same list the
// Nameserver tool uses). Most TLDs (incl. .id → PANDI) resolve via the bootstrap.
const CCTLD_RDAP = {
  io: 'https://rdap.identitydigital.services/rdap',
  sh: 'https://rdap.identitydigital.services/rdap',
  ac: 'https://rdap.identitydigital.services/rdap',
};
let _bootstrap = null;
async function rdapBaseForTld(tld) {
  const t = String(tld || '').toLowerCase();
  if (!t) return null;
  if (CCTLD_RDAP[t]) return CCTLD_RDAP[t];
  if (!_bootstrap) {
    _bootstrap = (async () => {
      const m = new Map();
      const j = await fetchJson('https://data.iana.org/rdap/dns.json');
      for (const svc of (j && j.services) || []) {
        const base = (svc[1] || []).find((u) => /^https:/i.test(u)) || (svc[1] || [])[0];
        if (base) for (const x of svc[0] || []) m.set(String(x).toLowerCase(), base.replace(/\/+$/, ''));
      }
      return m;
    })().catch(() => new Map());
  }
  return (await _bootstrap).get(t) || null;
}

// Raw RDAP GET that captures the status code (404 = not registered = AVAILABLE)
// without throwing.
async function fetchRdap(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/rdap+json', 'user-agent': 'snagged-beeper/1.0 (+https://research.snagged.com)' } });
    let data = null;
    try { data = await res.json(); } catch { /* may be empty/non-JSON */ }
    return { code: res.status, data };
  } catch {
    return { code: null, data: null };
  } finally {
    clearTimeout(timer);
  }
}

// → { ok, code, available, statuses[], expiration, source }
//   available=true  → the domain DROPPED (404 / not found) — go grab it.
//   statuses        → lowercased EPP statuses (e.g. ['pending delete','redemption period']).
//   ok=false        → every endpoint failed (network/rate-limit) — don't treat as a change.
export async function rdapStatus(domain) {
  const d = String(domain || '').trim().toLowerCase().replace(/^www\./, '');
  if (!d || !d.includes('.')) return { ok: false, code: null, available: null, statuses: [], expiration: null, source: null };
  const tld = d.slice(d.lastIndexOf('.') + 1);
  const base = await rdapBaseForTld(tld);

  const urls = [];
  if (base) urls.push(`${base}/domain/${encodeURIComponent(d)}`);
  urls.push(`https://rdap.org/domain/${encodeURIComponent(d)}`);

  for (const url of urls) {
    const r = await fetchRdap(url);
    if (r.code === 200 && r.data) {
      const statuses = [...new Set((r.data.status || []).map((s) => String(s).toLowerCase().trim()))].sort();
      const exp = (r.data.events || []).find((e) => e && e.eventAction === 'expiration');
      return { ok: true, code: 200, available: false, statuses, expiration: (exp && exp.eventDate) || null, source: url };
    }
    // 404 (and some registries' 200-with-notfound) → not registered → available.
    if (r.code === 404) return { ok: true, code: 404, available: true, statuses: [], expiration: null, source: url };
    // 429 / 5xx / network → try the next endpoint.
  }
  return { ok: false, code: null, available: null, statuses: [], expiration: null, source: null };
}

// Is the domain IN the deletion/expiry pipeline (heading toward a possible drop)?
// While true, it's worth watching; once it leaves this set to a clean registered
// state, it renewed and won't drop — so the watch can stop.
const LIFECYCLE = /(pending delete|pendingdelete|redemption|pending restore|pendingrestore|auto.?renew|renew period|renewperiod)/i;
export function inDeletionLifecycle(statuses) {
  return (statuses || []).some((s) => LIFECYCLE.test(String(s)));
}

// Human one-liner for alerts/UI from a status result.
export function describeStatus(s) {
  if (!s || !s.ok) return 'status unavailable';
  if (s.available) return 'AVAILABLE — dropped! 🎯';
  if (!s.statuses.length) return 'registered (no special status)';
  return s.statuses.join(', ');
}
