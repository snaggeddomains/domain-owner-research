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
