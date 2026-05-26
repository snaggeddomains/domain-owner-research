import { fetchJson, normalizeDomain, isValidDomain } from '../util.js';

// Common TLDs to probe for same-label siblings (free RDAP, so generous).
const DEFAULT_TLDS = ['com', 'net', 'org', 'io', 'co', 'us', 'info', 'biz', 'me', 'app', 'ai', 'xyz', 'dev', 'tv', 'cc'];
const MAX_DEFAULT = 14;

// Pull the fields we care about out of an RDAP response.
function parseRdap(rdap) {
  const events = Array.isArray(rdap.events) ? rdap.events : [];
  const ev = (action) => (events.find((e) => e.eventAction === action) || {}).eventDate || null;
  const entities = Array.isArray(rdap.entities) ? rdap.entities : [];
  const vcard = (ent) => {
    const arr = ent && Array.isArray(ent.vcardArray) ? ent.vcardArray[1] : [];
    const get = (key) => {
      const f = (arr || []).find((x) => Array.isArray(x) && x[0] === key);
      return f ? f[3] : null;
    };
    return { fn: get('fn'), email: get('email'), org: get('org') };
  };
  const byRole = (role) => entities.find((e) => Array.isArray(e.roles) && e.roles.includes(role));
  const registrant = byRole('registrant') ? vcard(byRole('registrant')) : {};
  const registrar = byRole('registrar') ? vcard(byRole('registrar')) : {};
  return {
    created: ev('registration'),
    expires: ev('expiration'),
    registrar: registrar.fn || registrar.org || null,
    registrant_name: registrant.fn || null,
    registrant_org: registrant.org || null,
    registrant_email: registrant.email || null,
    nameservers: (Array.isArray(rdap.nameservers) ? rdap.nameservers : [])
      .map((n) => (n.ldhName || '').toLowerCase())
      .filter(Boolean),
    status: Array.isArray(rdap.status) ? rdap.status : [],
  };
}

export default {
  name: 'registration_cluster',
  description:
    'Free. Registration cluster: checks same-label siblings on other TLDs (e.g. drive.net/.org/.io for drive.com) ' +
    'via RDAP — which exist, their CREATION dates (siblings registered around the same time as the target are ' +
    'likely the same owner), nameservers, and any PUBLIC registrant/contact. A sibling registered days apart or ' +
    'sharing nameservers — especially one whose WHOIS is NOT private — is a strong owner lead worth pivoting on.',
  parameters: { type: 'object', properties: { domain: { type: 'string' } }, required: ['domain'] },
  async run({ domain }, ctx = {}) {
    const env = (ctx && ctx.env) || {};
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);

    const sld = d.split('.')[0];
    const targetTld = d.split('.').slice(1).join('.');
    const tlds = env.CLUSTER_TLDS
      ? String(env.CLUSTER_TLDS).split(',').map((s) => s.trim()).filter(Boolean)
      : DEFAULT_TLDS;
    const max = Number(env.CLUSTER_MAX || MAX_DEFAULT);
    const windowDays = Number(env.CLUSTER_WINDOW_DAYS || 7);
    const candidates = tlds.filter((t) => t !== targetTld).slice(0, max).map((t) => `${sld}.${t}`);

    // One RDAP attempt. Distinguish "not registered" (404) from a transient
    // failure (timeout / rate-limit) so we only retry the latter.
    const rdapOnce = async (cand) => {
      try {
        const rdap = await fetchJson(`https://rdap.org/domain/${encodeURIComponent(cand)}`, {}, 9000);
        return { domain: cand, registered: true, ...parseRdap(rdap) };
      } catch (e) {
        const msg = String(e?.message || e);
        if (/HTTP 404/.test(msg)) return { domain: cand, registered: false, note: 'not registered' };
        return { domain: cand, registered: false, failed: true, note: msg.slice(0, 120) };
      }
    };

    const all = [d, ...candidates];
    const looked = await Promise.all(all.map(rdapOnce));
    // Retry just the transient failures — a smaller burst tends to succeed
    // (rdap.org rate-limits/times-out under a wide parallel fan-out).
    const retryIdx = looked.map((r, i) => (r.failed ? i : -1)).filter((i) => i >= 0);
    if (retryIdx.length) {
      const retried = await Promise.all(retryIdx.map((i) => rdapOnce(all[i])));
      retryIdx.forEach((i, k) => { looked[i] = retried[k]; });
    }

    const target = looked[0];
    const targetMs = target.created ? new Date(target.created).getTime() : null;
    const targetNs = new Set(target.nameservers || []);

    const registered = looked.slice(1).filter((s) => s.registered);
    registered.forEach((s) => {
      if (targetMs && s.created) s.days_from_target = Math.round(Math.abs(new Date(s.created).getTime() - targetMs) / 86400000);
      s.shares_nameserver = (s.nameservers || []).some((n) => targetNs.has(n));
      // Same owner is likely when registered within the window OR sharing infra.
      s.in_cluster = (s.days_from_target != null && s.days_from_target <= windowDays) || s.shares_nameserver;
    });
    const bySpan = (a, b) => (a.days_from_target ?? Infinity) - (b.days_from_target ?? Infinity);
    const cluster = registered.filter((s) => s.in_cluster).sort(bySpan);
    const other_siblings = registered.filter((s) => !s.in_cluster).sort(bySpan);

    return {
      domain: d,
      target_created: target.created || null,
      target_nameservers: target.nameservers || [],
      window_days: windowDays,
      siblings_checked: candidates.length,
      registered_siblings: registered.length,
      lookup_failed: looked.slice(1).filter((s) => s.failed).length,
      cluster, // within the window OR sharing nameservers → likely the same owner
      other_siblings, // registered but far apart with no shared infra → likely different owners
    };
  },
};
