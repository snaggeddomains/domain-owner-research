import net from 'node:net';
import { normalizeDomain, isValidDomain } from '../util.js';

// Free, legacy port-43 WHOIS. RDAP for thin registries (notably .com/.net) only
// returns registrar + dates + nameservers — the registrant's NAME/EMAIL/PHONE
// lives on the registrar's WHOIS server, which is what whois.com shows. This
// source follows the IANA → registry → registrar referral chain and parses the
// public registrant contact so it surfaces on the FREE pre-flight (no credits).

// WHOIS DNSSEC value → boolean|null. "yes"/"signedDelegation" → true; "no"/
// "unsigned"/"signed: no" → false; anything unrecognized (or empty) → null.
function dnssecBool(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return null;
  if (/^(no|unsigned|signed:\s*no)\b/.test(s)) return false;
  if (/^(yes|true|signed|signeddelegation)\b/.test(s) || /\bds\b/.test(s)) return true;
  return null;
}

const PRIVACY_RE =
  /redact|privacy|priv(at|ate)|proxy|whois\s?guard|data\s?protected|gdpr|not\s?disclosed|withheld|statutory\s?masking|identity\s?protect|contact\s?privacy|domains?\s?by\s?proxy/i;
// nic.it (.it) and a few ccTLDs print the literal token "hidden" for a
// privacy-redacted contact field — treat an EXACTLY-"hidden" name/org as redacted
// (bounded so a real registrant like "Hidden Valley LLC" isn't false-flagged).
const REDACT_TOKEN_RE = /^(hidden|redacted|n\/a|not available)$/i;

// Authoritative registry WHOIS servers for common TLDs, so the lookup works
// without a (port-43) IANA round-trip and never falls back to a wrong guess.
const REGISTRY = {
  com: 'whois.verisign-grs.com', net: 'whois.verisign-grs.com',
  org: 'whois.publicinterestregistry.org', info: 'whois.afilias.net', biz: 'whois.nic.biz',
  io: 'whois.nic.io', ai: 'whois.nic.ai', co: 'whois.nic.co',
  app: 'whois.nic.google', dev: 'whois.nic.google', xyz: 'whois.nic.xyz',
  me: 'whois.nic.me', us: 'whois.nic.us', tv: 'whois.nic.tv', cc: 'whois.nic.cc',
};

function whoisQuery(server, query, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let data = '';
    const socket = net.connect(43, server);
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => socket.write(`${query}\r\n`));
    socket.on('data', (chunk) => { data += chunk.toString('utf8'); });
    socket.on('end', () => resolve(data));
    socket.on('timeout', () => { socket.destroy(); data ? resolve(data) : reject(new Error(`WHOIS timeout (${server})`)); });
    socket.on('error', (e) => (data ? resolve(data) : reject(e)));
  });
}

// Find the next WHOIS server a response refers us to (registry → registrar).
function parseRefer(text) {
  const m = text.match(/(?:registrar whois server|whois server|refer)\s*:\s*([^\s]+)/i);
  return m ? m[1].trim().replace(/\.$/, '').toLowerCase() : '';
}

async function ianaRefer(tld) {
  try {
    const r = await whoisQuery('whois.iana.org', tld);
    const m = r.match(/refer:\s*(\S+)/i);
    return m ? m[1].trim().toLowerCase() : '';
  } catch {
    return '';
  }
}

// A non-indented block header used by BLOCK-structured WHOIS (many ccTLDs, e.g.
// nic.it): "Registrant" / "Registrar" / "Nameservers" on their own line, followed
// by INDENTED sub-fields. The standard ICANN gTLD format instead prefixes the key
// ("Registrar:", "Registrant Organization:") on one line — those carry a value, so
// they never match this header pattern (anchored, empty value) and parse as before.
const SECTION_HEAD = /^(registrant|admin(?:istrative)?(?:\s+contacts?)?|tech(?:nical)?(?:\s+contacts?)?|registrar|name\s?servers?)\s*:?\s*$/i;
const NS_SECTION_RE = /name\s?servers?/;

// Parse a WHOIS text into key→value (last wins, so registrar data overrides the
// thin registry record), collecting nameservers and statuses as lists. Also
// SECTION-AWARE: under a block header (nic.it-style) the indented sub-fields are
// ALSO stored section-qualified ("registrar organization", "registrant organization")
// so a generic "organization"/"name" in one block doesn't collide with another's,
// and bare indented hostnames under a "Nameservers" block are captured as NS.
function parseFields(text, into) {
  const f = into.fields;
  let section = '';
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) continue;
    const indented = /^\s/.test(line);
    const idx = line.indexOf(':');

    // A non-indented, value-less block header opens a section.
    if (!indented && SECTION_HEAD.test(line.trim())) {
      section = line.trim().replace(/:\s*$/, '').toLowerCase();
      continue;
    }
    if (idx < 1) {
      // Bare line, no "key:" — under a Nameservers block it's an NS hostname.
      if (NS_SECTION_RE.test(section)) {
        const host = line.trim().toLowerCase().split(/\s+/)[0].replace(/\.$/, '');
        if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) into.nameservers.add(host);
      }
      continue;
    }
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (!indented) section = ''; // a top-level key:value ends any open block
    if (!val || /^https?:\/\//i.test(key)) continue;
    if (key === 'name server' || key === 'nserver') into.nameservers.add(val.toLowerCase().split(/\s+/)[0].replace(/\.$/, ''));
    else if (key === 'domain status' || key === 'status') into.status.add(val);
    else {
      f[key] = val; // bare key, last-wins (registry→registrar referral chain)
      if (indented && section) f[`${section} ${key}`] = val; // disambiguated
    }
  }
}

export default {
  name: 'whois_lookup',
  description:
    'Free legacy port-43 WHOIS for the CURRENT registration — follows the registry→registrar referral chain so it ' +
    'often returns the PUBLIC registrant NAME, ORGANIZATION, EMAIL, PHONE and address that thin RDAP (e.g. .com/.net) ' +
    'hides. Also returns registrar, creation/updated/expiry dates, nameservers and status codes, and flags when the ' +
    'record is privacy/proxy-redacted. Run this alongside rdap_whois on every domain.',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  async run({ domain }) {
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);
    const tld = d.split('.').pop();

    const start = REGISTRY[tld] || (await ianaRefer(tld)) || `whois.nic.${tld}`;
    const acc = { fields: {}, nameservers: new Set(), status: new Set() };
    const serversTried = [];
    let raw = '';

    let next = start;
    let guard = 0;
    let gotAny = false;
    const seen = new Set();
    while (next && !seen.has(next) && guard < 3) {
      seen.add(next);
      serversTried.push(next);
      let resp;
      try {
        resp = await whoisQuery(next, d);
      } catch (e) {
        if (!gotAny) throw e; // first hop failed outright — surface the error
        break;
      }
      gotAny = true;
      parseFields(resp, acc);
      raw = resp; // keep the richest (last) response for the raw dump
      const refer = parseRefer(resp);
      next = refer && refer !== next && !seen.has(refer) ? refer : '';
      guard++;
    }

    return {
      domain: d,
      whois_server: serversTried[serversTried.length - 1] || start,
      servers_chased: serversTried,
      ...deriveRecord(acc),
      raw: raw.slice(0, 4000),
    };
  },
};

// Build the structured record from an accumulated WHOIS parse. Split out (and
// exported) so the registry-format parsing can be unit-tested without the network.
export function deriveRecord(acc) {
  const f = acc.fields;
  const g = (...keys) => {
    for (const k of keys) if (f[k]) return f[k];
    return '';
  };
  const registrant = {
    name: g('registrant name', 'registrant'),
    organization: g('registrant organization', 'registrant org'),
    email: g('registrant email', 'registrant contact email'),
    phone: g('registrant phone'),
    country: g('registrant country'),
    state: g('registrant state/province'),
  };
  const admin = {
    name: g('admin name', 'administrative contact'),
    email: g('admin email'),
    phone: g('admin phone'),
  };
  const tech = { name: g('tech name'), email: g('tech email'), phone: g('tech phone') };

  const identityText = [registrant.name, registrant.organization, registrant.email].filter(Boolean).join(' ');
  // A field that is ONLY a redaction token ("hidden"/"redacted"/…) isn't a real
  // identity — treat it as absent so the record reads as privacy-protected.
  const realIdentity = [registrant.name, registrant.organization].some((v) => v && !REDACT_TOKEN_RE.test(v.trim())) || Boolean(registrant.email || registrant.phone);
  const privacy = !realIdentity || PRIVACY_RE.test(identityText);

  return {
    registrar: g('registrar', 'sponsoring registrar', 'registrar organization', 'registrar name'),
    created: g('creation date', 'created', 'created on', 'registered on', 'registration date', 'registration time'),
    updated: g('updated date', 'last updated', 'last modified', 'last update', 'last modified on', 'changed'),
    expires: g('registry expiry date', 'registrar registration expiration date', 'expiration date', 'expiry date', 'expire date', 'expiry', 'expire', 'expiration time', 'paid-till'),
    dnssec: dnssecBool(g('dnssec', 'registrar dnssec', 'dnssec ds records')),
    nameservers: [...acc.nameservers],
    status: [...acc.status],
    registrant,
    admin,
    tech,
    privacy,
  };
}

// Parse a single WHOIS text blob into the structured record (test/entry helper).
export function parseWhoisText(text) {
  const acc = { fields: {}, nameservers: new Set(), status: new Set() };
  parseFields(String(text || ''), acc);
  return deriveRecord(acc);
}
