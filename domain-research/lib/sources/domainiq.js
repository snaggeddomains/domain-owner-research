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

// raw=1 returns one WHOIS snapshot per crawl date — often dozens of near-identical
// entries. Collapse consecutive identical ownership states into dated "eras" so
// the FULL lineage (including old pre-privacy owners) survives the model's input
// budget instead of being truncated to only the most recent records.
function summarizeHistory(data) {
  const raw = data && data.raw;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return data;

  const field = (t, re) => ((t.match(re) || [])[1] || '').trim();
  const fingerprint = (t) =>
    [
      field(t, /Registrant Organization:\s*([^\n\r]+)/i),
      field(t, /Registrant Name:\s*([^\n\r]+)/i),
      field(t, /Registrant Email:\s*([^\n\r]+)/i),
      field(t, /Registrant Phone:\s*([^\n\r]+)/i),
      field(t, /Registrar:\s*([^\n\r]+)/i),
    ].join(' | ');

  const entries = Object.entries(raw)
    .map(([k, v]) => ({ date: (String(k).match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || String(k), text: String(v) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const eras = [];
  for (const e of entries) {
    const fp = fingerprint(e.text);
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
        registrant_org: field(e.text, /Registrant Organization:\s*([^\n\r]+)/i),
        registrant_name: field(e.text, /Registrant Name:\s*([^\n\r]+)/i),
        registrant_email: field(e.text, /Registrant Email:\s*([^\n\r]+)/i),
        registrant_phone: field(e.text, /Registrant Phone:\s*([^\n\r]+)/i),
        registrar: field(e.text, /Registrar:\s*([^\n\r]+)/i),
        nameservers: [
          ...new Set(
            (e.text.match(/Name Server:\s*([^\n\r]+)/gi) || []).map((s) =>
              s.replace(/Name Server:\s*/i, '').trim().toLowerCase().replace(/\.$/, ''),
            ),
          ),
        ],
        record: e.text.slice(0, 900),
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
    return agent ? await fetchViaProxy(url, agent) : await fetchJson(url);
  },
};
