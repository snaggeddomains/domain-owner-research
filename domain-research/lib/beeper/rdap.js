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

// The registrar name from an RDAP domain object — the entity with role 'registrar',
// read from its vCard `fn` (e.g. "NameCheap, Inc." / "Dynadot Inc"), falling back to
// its IANA registrar id. Null when absent.
function registrarName(data) {
  const ents = (data && data.entities) || [];
  for (const e of ents) {
    if (!e || !Array.isArray(e.roles) || !e.roles.includes('registrar')) continue;
    const vc = e.vcardArray && e.vcardArray[1];
    if (Array.isArray(vc)) {
      const fn = vc.find((p) => Array.isArray(p) && p[0] === 'fn');
      if (fn && fn[3]) return String(fn[3]).trim();
    }
    const pid = Array.isArray(e.publicIds) ? e.publicIds.find((p) => /iana/i.test((p && p.type) || '')) : null;
    if (pid && pid.identifier) return `IANA #${pid.identifier}`;
  }
  return null;
}

// Known WHOIS-privacy / proxy email domains — an email here is NOT the real owner
// (it's a masked forwarder or a hashed alias), so we treat the registrant as private.
const PRIVACY_EMAIL_DOMAINS = new Set([
  'domainsbyproxy.com', 'withheldforprivacy.com', 'whoisguard.com', 'whoisprivacyprotect.com',
  'privacyprotect.org', 'privacyprotect.com', 'contactprivacy.com', 'contactprivacy.email',
  'privacyguardian.org', 'identity-protect.org', 'identityprotect.org', 'whoisprivacycorp.com',
  'privatebydesign.com', 'private-whois.com', 'privateregistration.org', 'data-protect.eu',
  'tieredaccess.com', 'anonymize.com', 'njal.la', 'gname.com', 'domaindiscreet.com',
  'protecteddomainservices.com', '1and1-private-registration.com', 'porkbun.com',
  'gandi.net', 'dynadot.com', 'namecheap.com', 'godaddy.com', 'nc.privacyguard.org',
]);
// Generic role/privacy mailbox localparts (privacy@dynadot.com, whois@…, abuse@…) — never a
// real reachable owner, whatever the domain.
const GENERIC_LOCALPARTS = new Set([
  'privacy', 'proxy', 'whois', 'whoisguard', 'redacted', 'redact', 'abuse', 'hostmaster',
  'postmaster', 'webmaster', 'noreply', 'no-reply', 'donotreply', 'do-not-reply',
  'domainprivacy', 'privateregistration', 'privacyprotect', 'dataprotection',
]);
// A localpart that's a long hex/opaque hash (e.g. 2f7addfd… or 3fbcbb…-47512530) is a
// generated proxy alias — an optional -id / .suffix after the hash still counts.
const HASH_LOCALPART = /^[a-f0-9]{16,}([._-][a-z0-9]+)*$/i;
// vCard `fn` placeholders that mean "redacted", not a real person/company name.
const PRIVACY_FN = /(registration private|redacted|privacy|withheld|not disclosed|whois|data protected|statutory masking|domain admin(istrator)?|proxy|perfect privacy|contact privacy)/i;

function emailIsPrivate(email) {
  const at = email.indexOf('@');
  if (at < 1) return true;
  const local = email.slice(0, at).toLowerCase();
  const dom = email.slice(at + 1).toLowerCase();
  if (GENERIC_LOCALPARTS.has(local)) return true;                 // privacy@ / whois@ / abuse@ …
  // A known privacy/proxy provider OR any subdomain of one (e.g. contact.gandi.net → gandi.net).
  for (const pd of PRIVACY_EMAIL_DOMAINS) { if (dom === pd || dom.endsWith('.' + pd)) return true; }
  if (HASH_LOCALPART.test(local) && !/gmail|outlook|hotmail|yahoo|icloud|proton/.test(dom)) return true;
  return false;
}

// Pull the registrant contact from an RDAP domain object. Prefers the `registrant`
// entity, falling back to administrative/technical (often identical). Decides PUBLIC vs
// PRIVATE by the EMAIL, not the org string — a name behind a "privacy service" org whose
// email is a real mailbox (e.g. a plain gmail) is a reachable, real contact worth listing.
// → { name, email, phone, private }. `private` true = masked/redacted (nothing to list).
function parseRegistrant(data) {
  const ents = (data && data.entities) || [];
  const byRole = (role) => ents.find((e) => e && Array.isArray(e.roles) && e.roles.includes(role));
  const e = byRole('registrant') || byRole('administrative') || byRole('technical');
  if (!e) return { name: null, email: null, phone: null, private: true };
  const vc = (e.vcardArray && e.vcardArray[1]) || [];
  const val = (key) => { const p = Array.isArray(vc) ? vc.find((x) => Array.isArray(x) && x[0] === key) : null; return p && p[3] != null ? String(p[3]).trim() : ''; };
  const fnRaw = val('fn');
  const email = val('email').toLowerCase();
  const phone = val('tel').replace(/^tel:/i, '').trim();
  const priv = !email || emailIsPrivate(email);
  // Only surface a name that isn't itself a privacy placeholder.
  const name = fnRaw && !PRIVACY_FN.test(fnRaw) ? fnRaw : null;
  if (priv) return { name: null, email: null, phone: null, private: true };
  return { name: name || null, email: email || null, phone: phone || null, private: false };
}

// → { ok, code, available, statuses[], expiration, nameservers, registrar, source }
//   available=true  → the domain DROPPED (404 / not found) — go grab it.
//   statuses        → lowercased EPP statuses (e.g. ['pending delete','redemption period']).
//   ok=false        → every endpoint failed (network/rate-limit) — don't treat as a change.
export async function rdapStatus(domain, { single = false } = {}) {
  const d = String(domain || '').trim().toLowerCase().replace(/^www\./, '');
  const NO_REG = { registrantName: null, registrantEmail: null, registrantPhone: null, registrantPrivate: null };
  if (!d || !d.includes('.')) return { ok: false, code: null, available: null, statuses: [], expiration: null, nameservers: [], registrar: null, source: null, ...NO_REG };
  const tld = d.slice(d.lastIndexOf('.') + 1);
  const base = await rdapBaseForTld(tld);

  // `single` = query ONLY the authoritative registry endpoint (skip the rdap.org
  // fallback, which proxies to the SAME registry backend — hitting it doubles the
  // request load on a rate-limited registry like nic.ai for zero new information).
  // We keep the fallback when there's no bootstrap base to hit.
  const urls = [];
  if (base) urls.push(`${base}/domain/${encodeURIComponent(d)}`);
  if (!single || !base) urls.push(`https://rdap.org/domain/${encodeURIComponent(d)}`);

  for (const url of urls) {
    const r = await fetchRdap(url);
    if (r.code === 200 && r.data) {
      const statuses = [...new Set((r.data.status || []).map((s) => String(s).toLowerCase().trim()))].sort();
      const exp = (r.data.events || []).find((e) => e && e.eventAction === 'expiration');
      const nameservers = [...new Set((r.data.nameservers || [])
        .map((n) => String((n && (n.ldhName || n.name)) || '').toLowerCase().replace(/\.+$/, '').trim())
        .filter(Boolean))];
      const reg = parseRegistrant(r.data);
      return { ok: true, code: 200, available: false, statuses, expiration: (exp && exp.eventDate) || null, nameservers, registrar: registrarName(r.data), source: url, registrantName: reg.name, registrantEmail: reg.email, registrantPhone: reg.phone, registrantPrivate: reg.private };
    }
    // 404 (and some registries' 200-with-notfound) → not registered → available.
    if (r.code === 404) return { ok: true, code: 404, available: true, statuses: [], expiration: null, nameservers: [], registrar: null, source: url, ...NO_REG };
    // 429 / 5xx / network → try the next endpoint.
  }
  return { ok: false, code: null, available: null, statuses: [], expiration: null, nameservers: [], registrar: null, source: null, ...NO_REG };
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
