import { fetch as undiciFetch, ProxyAgent } from 'undici';
import { fetchJson } from '../util.js';

// Verified default endpoint (domain_history) — works with just DOMAINIQ_API_KEY.
// raw=1 returns the FULL history; without it DomainIQ only returns records that
// changed. Override with DOMAINIQ_URL_TEMPLATE (using {domain} and {key}) for a
// different service/params. The domain is URL-encoded before substitution.
const DEFAULT_TEMPLATE =
  'https://www.domainiq.com/api?key={key}&service=domain_history&domain={domain}&output_mode=json&raw=1';

// DomainIQ allowlists by IP, and Vercel has no static egress IP. Routing this
// one source through a static-IP proxy (Fixie) gives a stable IP to whitelist.
// Set FIXIE_URL (or DOMAINIQ_PROXY_URL); when unset the call goes out directly.
let proxyAgent;
function getProxyAgent() {
  if (proxyAgent !== undefined) return proxyAgent;
  const raw = process.env.FIXIE_URL || process.env.DOMAINIQ_PROXY_URL || '';
  if (!raw) {
    proxyAgent = null;
    return proxyAgent;
  }
  const u = new URL(raw);
  const opts = { uri: `${u.protocol}//${u.host}` };
  if (u.username || u.password) {
    const creds = `${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`;
    opts.token = `Basic ${Buffer.from(creds).toString('base64')}`;
  }
  proxyAgent = new ProxyAgent(opts);
  return proxyAgent;
}

async function fetchViaProxy(url, agent, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await undiciFetch(url, {
      dispatcher: agent,
      signal: ctrl.signal,
      headers: { accept: 'application/json', 'user-agent': 'domain-research/0.1' },
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    if (!res.ok) {
      const snippet = typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200);
      throw new Error(`HTTP ${res.status} from DomainIQ (via proxy): ${snippet}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

// CURRENT WHOIS via DomainIQ's `service=whois` (the "Whois" tab — NOT domain_history).
// This is the authoritative current-status source for registries that purge their
// RDAP record during pendingDelete (Identity Digital: .computer/.io/…), where RDAP
// and WhoisXML wrongly report the name as available. Returns the raw JSON/text body
// (caller inspects it), or null when unconfigured / on error. Routed through the
// Fixie proxy (DomainIQ is IP-allowlisted).
export async function domainIqCurrentWhois(domain, env = process.env) {
  const key = env.DOMAINIQ_API_KEY;
  if (!key) return null;
  const tmpl = env.DOMAINIQ_WHOIS_URL_TEMPLATE ||
    'https://www.domainiq.com/api?key={key}&service=whois&domain={domain}&output_mode=json';
  const url = tmpl
    .replaceAll('{domain}', encodeURIComponent(domain))
    .replaceAll('{key}', encodeURIComponent(key));
  try {
    const agent = getProxyAgent();
    return agent ? await fetchViaProxy(url, agent) : await fetchJson(url);
  } catch {
    return null;
  }
}

// raw=1 returns one WHOIS snapshot per crawl date — often dozens of near-identical
// entries. Collapse consecutive identical ownership states into dated "eras" so
// the FULL lineage (including old pre-privacy owners) survives the model's input
// budget instead of being truncated to only the most recent records.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

// Extract the registrant/owner from ONE WHOIS snapshot, tolerant of BOTH the
// modern ICANN labels AND the pre-2013 free-form format — which is exactly
// where the valuable pre-privacy named owners live (e.g. "Administrative
// Contact:\n  Ostaski, Bill admin@cove.com" rather than "Registrant Name:").
function party(t) {
  const m = (re) => ((t.match(re) || [])[1] || '').trim();
  let org = m(/Registrant Organization:\s*([^\n\r]+)/i);
  let name = m(/Registrant Name:\s*([^\n\r]+)/i);
  let email = m(/Registrant Email:\s*([^\n\r]+)/i);
  let phone = m(/Registrant Phone:\s*([^\n\r]+)/i);
  const registrar = m(/Registrar:\s*([^\n\r]+)/i) || m(/Registrar of Record:\s*([^\n\r]+)/i);

  if (!name) {
    name =
      m(/Registrant(?:\s*Contact)?:\s*\r?\n\s*([^\n\r]+)/i) ||
      m(/Administrative Contact[^:\n]*:\s*\r?\n?\s*([^\n\r]+)/i);
  }
  if (!email) {
    const e = t.match(new RegExp(EMAIL_RE.source, 'i'));
    if (e) email = e[0];
  }
  if (!phone) {
    // First phone-like number with >=10 digits, excluding ZIP+4 (#####-####).
    const cands = t.match(/\+?\d[\d\s().\-]{7,}\d/g) || [];
    phone = cands.find((c) => c.replace(/\D/g, '').length >= 10 && !/^\d{5}-\d{4}$/.test(c.trim())) || '';
  }
  if (!org) {
    // First non-label, non-numeric line is usually the org in old records.
    const first = t
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find((s) => s && !/[:@]/.test(s) && !/^\d/.test(s) && !/^US$/i.test(s) && /\s/.test(s));
    if (first) org = first;
  }
  // A name line often carries the email too ("Ostaski, Bill admin@cove.com").
  if (name) name = name.replace(EMAIL_RE, '').replace(/\s{2,}/g, ' ').trim();
  return { org, name, email, phone, registrar };
}

function summarizeHistory(data) {
  const raw = data && data.raw;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return data;

  const entries = Object.entries(raw)
    .map(([k, v]) => ({ date: (String(k).match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || String(k), text: String(v) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const eras = [];
  for (const e of entries) {
    const p = party(e.text);
    const fp = [p.org, p.name, p.email, p.phone, p.registrar].join(' | ');
    const prev = eras[eras.length - 1];
    if (prev && prev._fp === fp) {
      prev.last_seen = e.date;
      prev.snapshots += 1;
    } else {
      eras.push({
        _fp: fp,
        first_seen: e.date,
        last_seen: e.date,
        snapshots: 1,
        registrant_org: p.org,
        registrant_name: p.name,
        registrant_email: p.email,
        registrant_phone: p.phone,
        registrar: p.registrar,
        nameservers: [
          ...new Set(
            (e.text.match(/Name Server:\s*([^\n\r]+)/gi) || []).map((s) =>
              s.replace(/Name Server:\s*/i, '').trim().toLowerCase().replace(/\.$/, ''),
            ),
          ),
        ],
        record: e.text.slice(0, 1200),
      });
    }
  }
  eras.forEach((x) => delete x._fp);

  return { source: 'domainiq', total_snapshots: entries.length, distinct_eras: eras.length, eras };
}

export default {
  name: 'domainiq_lookup',
  description:
    'DomainIQ lookup (premium). Historical WHOIS / registrant timeline, reverse-WHOIS (other domains by the same ' +
    'registrant) and related-domain intelligence. Strong for tracking ownership changes and discovering a ' +
    "registrant's wider portfolio.",
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  requiresKey: ['DOMAINIQ_API_KEY'],
  async run({ domain }, { env }) {
    const template = env.DOMAINIQ_URL_TEMPLATE || DEFAULT_TEMPLATE;
    const url = template
      .replaceAll('{domain}', encodeURIComponent(domain))
      .replaceAll('{key}', encodeURIComponent(env.DOMAINIQ_API_KEY));
    const agent = getProxyAgent();
    const body = agent ? await fetchViaProxy(url, agent) : await fetchJson(url);
    // Collapse the full raw history into distinct ownership eras so the whole
    // lineage (incl. pre-privacy named owners) survives the model's input
    // budget instead of being truncated to only the newest snapshots.
    return summarizeHistory(body);
  },
};
