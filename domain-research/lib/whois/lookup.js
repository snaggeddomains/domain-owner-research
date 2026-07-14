// Whois module — a basic, free domain lookup.
//
// RDAP-first (the modern, structured, free replacement for port-43 WHOIS): one
// call returns registrar + IANA id, registration/expiry/updated dates, EPP status
// codes, nameservers and DNSSEC. Registry RDAP is resolved via IANA's bootstrap
// (authoritative) with an rdap.org fallback. We ALSO run the legacy port-43 WHOIS
// (lib/sources/whois.js) in parallel and merge in the public registrant contact,
// which thin registries (.com/.net) omit from RDAP — so the result is as complete
// as a free lookup gets. No API key, no cost.

import { fetchJson, normalizeDomain, isValidDomain } from '../util.js';
import whoisSource from '../sources/whois.js';

// ccTLDs that run RDAP but aren't in IANA's gTLD bootstrap (same list Beeper uses).
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

async function fetchRdap(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/rdap+json', 'user-agent': 'snagged-whois/1.0 (+https://research.snagged.com)' } });
    let data = null;
    try { data = await res.json(); } catch { /* may be empty / non-JSON */ }
    return { code: res.status, data };
  } catch {
    return { code: null, data: null };
  } finally {
    clearTimeout(timer);
  }
}

// DNS nameservers via DoH (Google) — used to corroborate an RDAP "not-found"
// before declaring a domain available. A domain with live NS delegation is
// registered, full stop, even when RDAP/WHOIS coverage is thin. NS record = type 2.
async function dnsNameservers(domain) {
  try {
    const j = await fetchJson(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`);
    const ans = (j && Array.isArray(j.Answer)) ? j.Answer : [];
    return ans.filter((a) => a && a.type === 2).map((a) => String(a.data || '').replace(/\.$/, '').toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

// MX records via DoH — a practical "is email actually in use here" signal: a domain
// with live MX is set up to RECEIVE mail (real mailbox / forwarding), one with none is
// almost certainly not using email at that domain. type MX = 15. Returns
// { active: bool | null (null = lookup failed → unknown), records:[{priority,host}], provider }.
const MX_PROVIDERS = [
  [/aspmx.*google|google\.com$|googlemail/i, 'Google Workspace'],
  [/protection\.outlook|office365|outlook\.com$/i, 'Microsoft 365'],
  [/zoho/i, 'Zoho'],
  [/proton(mail)?|pm\.me/i, 'Proton'],
  [/icloud|me\.com$|mail\.me\.com/i, 'iCloud'],
  [/pphosted|proofpoint/i, 'Proofpoint'],
  [/mimecast/i, 'Mimecast'],
  [/secureserver\.net/i, 'GoDaddy Email'],
  [/improvmx/i, 'ImprovMX (forwarding)'],
  [/forwardemail/i, 'ForwardEmail'],
  [/messagingengine|fastmail/i, 'Fastmail'],
  [/amazonaws|amazonses/i, 'Amazon SES'],
  [/mailgun/i, 'Mailgun'],
  [/sendgrid/i, 'SendGrid'],
  [/yandex/i, 'Yandex'],
  [/registrar-servers\.com/i, 'Namecheap Email'],
];
function mxProvider(records) {
  for (const r of records || []) for (const [re, label] of MX_PROVIDERS) if (re.test(r.host)) return label;
  return null;
}
export async function dnsMx(domain) {
  try {
    const j = await fetchJson(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`);
    if (!j || typeof j.Status !== 'number') return { active: null, records: [] }; // couldn't read → unknown
    const ans = Array.isArray(j.Answer) ? j.Answer : [];
    const records = ans
      .filter((a) => a && a.type === 15)
      .map((a) => {
        const parts = String(a.data || '').trim().split(/\s+/);
        const priority = parts.length > 1 ? Number(parts[0]) : null;
        const host = (parts.length > 1 ? parts[1] : parts[0] || '').replace(/\.$/, '').toLowerCase();
        return host ? { priority: Number.isFinite(priority) ? priority : null, host } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
    return { active: records.length > 0, records, provider: mxProvider(records) };
  } catch {
    return { active: null, records: [] };
  }
}

// Infer the registrar / DNS host from the nameserver hostnames. RDAP is dead for
// some ccTLDs (e.g. .co isn't in IANA's bootstrap and rdap.org 404s it) and the
// port-43 WHOIS leg can time out — leaving us with only the DNS-delegated
// nameservers. For the common managed registrars the NS host IS the registrar
// (name.com, GoDaddy's domaincontrol, Namecheap's registrar-servers, …), so we can
// still name it. Flagged `inferred` so the UI can note it's derived from the NS,
// not authoritative WHOIS. Pure-DNS hosts (Cloudflare/Route 53/…) are labeled as a
// DNS host rather than the registrar of record.
const NS_REGISTRAR = [
  [/(^|\.)name\.com$/i, 'Name.com', 'registrar'],
  [/(^|\.)domaincontrol\.com$/i, 'GoDaddy', 'registrar'],
  [/(^|\.)registrar-servers\.com$/i, 'Namecheap', 'registrar'],
  [/(^|\.)dynadot\.com$/i, 'Dynadot', 'registrar'],
  [/(^|\.)porkbun\.com$/i, 'Porkbun', 'registrar'],
  [/(^|\.)gandi\.net$/i, 'Gandi', 'registrar'],
  [/(^|\.)hover\.com$/i, 'Hover', 'registrar'],
  [/(^|\.)googledomains\.com$/i, 'Google Domains / Squarespace', 'registrar'],
  [/(^|\.)dnsimple\.com$/i, 'DNSimple', 'registrar'],
  [/(^|\.)ionos|1and1|1und1/i, 'IONOS', 'registrar'],
  [/(^|\.)ovh\.net$/i, 'OVH', 'registrar'],
  [/(^|\.)nsone\.net$|(^|\.)ns1\.net$/i, 'NS1', 'dns host'],
  [/(^|\.)cloudflare\.com$/i, 'Cloudflare', 'dns host'],
  [/(^|\.)awsdns|amazonaws|route53/i, 'Amazon Route 53', 'dns host'],
  [/(^|\.)azure-dns\./i, 'Azure DNS', 'dns host'],
  [/(^|\.)wixdns\.net$/i, 'Wix', 'dns host'],
  [/(^|\.)squarespacedns\.com$/i, 'Squarespace', 'dns host'],
  [/(^|\.)shopify/i, 'Shopify', 'dns host'],
  [/(^|\.)vercel-dns\.com$/i, 'Vercel', 'dns host'],
  [/(^|\.)netlify/i, 'Netlify', 'dns host'],
  [/(^|\.)digitalocean\.com$/i, 'DigitalOcean', 'dns host'],
  [/(^|\.)sedoparking\.com$|(^|\.)sedo\.com$/i, 'Sedo (parked)', 'parking'],
  [/(^|\.)bodis\.com$/i, 'Bodis (parked)', 'parking'],
  [/(^|\.)above\.com$|afternic|dan\.com$/i, 'Afternic / Dan (listed)', 'parking'],
  [/(^|\.)uniregistrymarket|uniregistry/i, 'UNR / Uniregistry', 'registrar'],
];
function registrarFromNameservers(nameservers) {
  for (const ns of nameservers || []) {
    const host = String(ns || '').toLowerCase();
    for (const [re, label, kind] of NS_REGISTRAR) if (re.test(host)) return { name: label, kind };
  }
  return null;
}

// Flatten an RDAP jCard (vcardArray) into the fields we care about.
function parseVcard(vcardArray) {
  const out = { fn: '', org: '', email: '', tel: '', country: '', region: '' };
  const items = Array.isArray(vcardArray) && Array.isArray(vcardArray[1]) ? vcardArray[1] : [];
  for (const it of items) {
    if (!Array.isArray(it)) continue;
    const [name, , , value] = it;
    if (name === 'fn' && typeof value === 'string') out.fn = value;
    else if (name === 'org') out.org = Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value || '');
    else if (name === 'email' && typeof value === 'string') out.email = value;
    else if (name === 'tel' && typeof value === 'string') out.tel = value.replace(/^tel:/i, '');
    else if (name === 'adr') {
      // adr value is a 7-part array: [pobox, ext, street, locality, region, postcode, country]
      const parts = Array.isArray(value) ? value : [];
      out.region = out.region || (parts[4] || '');
      out.country = out.country || (parts[6] || '');
    }
  }
  return out;
}

const roleOf = (e, role) => Array.isArray(e.roles) && e.roles.includes(role);
function findEntity(entities, role) {
  for (const e of entities || []) {
    if (roleOf(e, role)) return e;
    const nested = findEntity(e.entities, role);
    if (nested) return nested;
  }
  return null;
}
function eventDate(events, action) {
  const e = (events || []).find((x) => x && x.eventAction === action);
  return (e && e.eventDate) || null;
}
function contactFrom(entities, role) {
  const e = findEntity(entities, role);
  if (!e) return null;
  const v = parseVcard(e.vcardArray);
  const c = { name: v.fn || null, organization: v.org || null, email: v.email || null, phone: v.tel || null, country: v.country || null, region: v.region || null, handle: e.handle || null };
  return Object.values(c).some(Boolean) ? c : null;
}

// → structured RDAP result, or { ok:false } / { available:true } when not found.
async function rdapLookup(domain) {
  const tld = domain.slice(domain.lastIndexOf('.') + 1);
  const base = await rdapBaseForTld(tld);
  const urls = [];
  if (base) urls.push(`${base}/domain/${encodeURIComponent(domain)}`);
  urls.push(`https://rdap.org/domain/${encodeURIComponent(domain)}`);

  for (const url of urls) {
    const r = await fetchRdap(url);
    if (r.code === 404) return { ok: true, available: true, source: url };
    if (r.code === 200 && r.data) {
      const d = r.data;
      const entities = d.entities || [];
      const reg = findEntity(entities, 'registrar');
      const regVcard = reg ? parseVcard(reg.vcardArray) : {};
      const ianaId = reg && Array.isArray(reg.publicIds)
        ? (reg.publicIds.find((p) => /iana/i.test(p.type || ''))?.identifier || null) : null;
      const regUrl = reg && Array.isArray(reg.links)
        ? (reg.links.find((l) => l && /^https?:/i.test(l.value || l.href || ''))?.href || null) : null;
      const abuse = reg ? findEntity(reg.entities, 'abuse') : null;
      const abuseVcard = abuse ? parseVcard(abuse.vcardArray) : {};
      return {
        ok: true,
        available: false,
        source: url,
        unicodeName: d.unicodeName || null,
        ldhName: d.ldhName || domain,
        registrar: { name: regVcard.fn || (reg && reg.handle) || null, ianaId, url: regUrl },
        abuse: { email: abuseVcard.email || null, phone: abuseVcard.tel || null },
        dates: {
          registered: eventDate(d.events, 'registration'),
          expires: eventDate(d.events, 'expiration'),
          updated: eventDate(d.events, 'last changed'),
          rdapUpdated: eventDate(d.events, 'last update of RDAP database'),
        },
        statuses: [...new Set((d.status || []).map((s) => String(s)))],
        nameservers: (d.nameservers || []).map((n) => String(n.ldhName || '').toLowerCase()).filter(Boolean),
        dnssec: d.secureDNS ? !!d.secureDNS.delegationSigned : null,
        contacts: {
          registrant: contactFrom(entities, 'registrant'),
          admin: contactFrom(entities, 'administrative'),
          tech: contactFrom(entities, 'technical'),
        },
        raw: d,
      };
    }
    // 429 / 5xx / network → try the next endpoint.
  }
  return { ok: false };
}

// Public entry: merge RDAP (structured core) + port-43 WHOIS (registrant contact
// the thin registries hide), both best-effort. Either leg alone still returns.
export async function whoisLookup(domainRaw) {
  const domain = normalizeDomain(domainRaw);
  if (!domain || !isValidDomain(domain)) throw new Error('Provide a valid domain (e.g. example.com).');

  const [rdapR, whoisR, mxR] = await Promise.allSettled([
    rdapLookup(domain),
    whoisSource.run({ domain }).catch(() => null),
    dnsMx(domain),
  ]);
  const rdap = rdapR.status === 'fulfilled' ? rdapR.value : { ok: false };
  const whois = whoisR.status === 'fulfilled' ? whoisR.value : null;
  const mx = mxR.status === 'fulfilled' ? mxR.value : { active: null, records: [] };

  // RDAP "not-found" is NOT proof of availability: some ccTLD registries (e.g.
  // .co) aren't in IANA's RDAP bootstrap, so rdap.org 404s a perfectly registered
  // domain. Before declaring available, corroborate with the legacy WHOIS leg and
  // a DNS NS lookup — either one finding a record means it's registered.
  let dnsNs = [];
  if (rdap && rdap.available) {
    const whoisRegistered = !!(whois && (whois.created || whois.registrar || (whois.nameservers && whois.nameservers.length)));
    if (!whoisRegistered) dnsNs = await dnsNameservers(domain);
    if (!whoisRegistered && dnsNs.length === 0) {
      return { domain, available: true, registrar: null, dates: {}, statuses: [], nameservers: [], mx: { active: false, records: [] }, contacts: {}, privacy: false, sources: { rdap: rdap.source, whois: null }, raw: {} };
    }
    // Registered after all — fall through and build the result from WHOIS + DNS.
  }

  // Prefer RDAP for the structured core; fall back to WHOIS field-by-field.
  const nsList = (rdap.nameservers && rdap.nameservers.length) ? rdap.nameservers
    : (whois && whois.nameservers && whois.nameservers.length) ? whois.nameservers
    : dnsNs;
  // Last resort: when neither RDAP nor WHOIS named a registrar (dead-RDAP ccTLDs
  // like .co, or a timed-out WHOIS leg), infer it from the nameservers so the
  // lookup ALWAYS shows who the domain is with. Marked `inferred` for the UI.
  const nsGuess = registrarFromNameservers(nsList);
  const registrar = (rdap.registrar && rdap.registrar.name) ? rdap.registrar
    : (whois && whois.registrar) ? { name: whois.registrar, ianaId: null, url: null }
    : nsGuess ? { name: nsGuess.name, ianaId: null, url: null, inferred: true, inferredKind: nsGuess.kind }
    : null;
  const dates = {
    registered: (rdap.dates && rdap.dates.registered) || (whois && whois.created) || null,
    expires: (rdap.dates && rdap.dates.expires) || (whois && whois.expires) || null,
    updated: (rdap.dates && rdap.dates.updated) || (whois && whois.updated) || null,
  };
  const statuses = (rdap.statuses && rdap.statuses.length) ? rdap.statuses : (whois ? whois.status || [] : []);
  const nameservers = nsList;

  // Registrant: RDAP rarely exposes it (GDPR); WHOIS often does. Merge per-field.
  const rReg = (rdap.contacts && rdap.contacts.registrant) || {};
  const wReg = (whois && whois.registrant) || {};
  const registrant = {
    name: rReg.name || wReg.name || null,
    organization: rReg.organization || wReg.organization || null,
    email: rReg.email || wReg.email || null,
    phone: rReg.phone || wReg.phone || null,
    country: rReg.country || wReg.country || null,
    region: rReg.region || wReg.state || null,
  };
  const hasRegistrant = Object.values(registrant).some(Boolean);
  const privacy = whois ? !!whois.privacy : !hasRegistrant;

  return {
    domain: rdap.unicodeName || domain,
    available: false,
    registrar,
    abuse: rdap.abuse || null,
    dates,
    statuses,
    nameservers,
    mx,
    dnssec: rdap.dnssec ?? null,
    contacts: {
      registrant: hasRegistrant ? registrant : null,
      admin: (rdap.contacts && rdap.contacts.admin) || (whois && whois.admin && (whois.admin.name || whois.admin.email) ? whois.admin : null) || null,
      tech: (rdap.contacts && rdap.contacts.tech) || (whois && whois.tech && (whois.tech.name || whois.tech.email) ? whois.tech : null) || null,
    },
    privacy,
    sources: { rdap: rdap.ok ? rdap.source : null, whois: whois ? whois.whois_server : null },
    raw: { rdap: rdap.raw || null, whois: whois ? whois.raw : null },
  };
}
