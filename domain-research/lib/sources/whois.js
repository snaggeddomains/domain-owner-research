import net from 'node:net';
import { normalizeDomain, isValidDomain } from '../util.js';

// Free, legacy port-43 WHOIS. RDAP for thin registries (notably .com/.net) only
// returns registrar + dates + nameservers — the registrant's NAME/EMAIL/PHONE
// lives on the registrar's WHOIS server, which is what whois.com shows. This
// source follows the IANA → registry → registrar referral chain and parses the
// public registrant contact so it surfaces on the FREE pre-flight (no credits).

const PRIVACY_RE =
  /redact|privacy|priv(at|ate)|proxy|whois\s?guard|data\s?protected|gdpr|not\s?disclosed|withheld|statutory\s?masking|identity\s?protect|contact\s?privacy|domains?\s?by\s?proxy/i;

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

// Parse a WHOIS text into key→value (last wins, so registrar data overrides the
// thin registry record), collecting nameservers and statuses as lists.
function parseFields(text, into) {
  const f = into.fields;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    const idx = line.indexOf(':');
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (!val || /^https?:\/\//i.test(key)) continue;
    if (key === 'name server' || key === 'nserver') into.nameservers.add(val.toLowerCase().split(/\s+/)[0]);
    else if (key === 'domain status' || key === 'status') into.status.add(val);
    else f[key] = val;
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

    const f = acc.fields;
    const g = (...keys) => {
      for (const k of keys) if (f[k]) return f[k];
      return '';
    };
    const registrant = {
      name: g('registrant name'),
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
    const hasRegistrant = Boolean(registrant.name || registrant.organization || registrant.email || registrant.phone);
    const privacy = !hasRegistrant || PRIVACY_RE.test(identityText);

    return {
      domain: d,
      whois_server: serversTried[serversTried.length - 1] || start,
      servers_chased: serversTried,
      registrar: g('registrar', 'sponsoring registrar', 'registrar name'),
      created: g('creation date', 'created', 'created on', 'registered on', 'registration date'),
      updated: g('updated date', 'last updated', 'last modified'),
      expires: g('registry expiry date', 'registrar registration expiration date', 'expiration date', 'expiry date'),
      nameservers: [...acc.nameservers],
      status: [...acc.status],
      registrant,
      admin,
      tech,
      privacy,
      raw: raw.slice(0, 4000),
    };
  },
};
