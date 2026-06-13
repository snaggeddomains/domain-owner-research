// Corporate Portfolios — fan a set of registrant keys out across every available
// reverse-WHOIS provider and UNION the results. No single provider is complete
// (Whoxy is thin on MarkMonitor/CSC-masked corporates; WhoisXML's historic index
// is far deeper; DomainIQ adds pre-privacy coverage), so the union is the win.
//
// Every provider is best-effort: a missing key or an error just contributes 0 and
// is recorded in `errors` — the pull still returns whatever the others found.

import { reverseWhoisAll } from '../whoxy.js';
import { fetchJson } from '../util.js';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

const lc = (s) => String(s || '').toLowerCase().trim();
const isDomain = (s) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(lc(s));

// Fixie (or DOMAINIQ_PROXY_URL) static-IP proxy — DomainIQ allowlists by IP and
// Vercel has no static egress, so its reverse call MUST route through the proxy.
let _proxy;
function proxyAgent() {
  if (_proxy !== undefined) return _proxy;
  const raw = process.env.FIXIE_URL || process.env.DOMAINIQ_PROXY_URL || '';
  if (!raw) { _proxy = null; return _proxy; }
  const u = new URL(raw);
  const opts = { uri: `${u.protocol}//${u.host}` };
  if (u.username || u.password) {
    const creds = `${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`;
    opts.token = `Basic ${Buffer.from(creds).toString('base64')}`;
  }
  _proxy = new ProxyAgent(opts);
  return _proxy;
}

// WhoisXML Reverse WHOIS — current + historic, uncapped (mode: purchase returns
// the full domainsList). Works from Vercel (key-based, no IP allowlist).
async function whoisxmlReverse(term, env, searchType) {
  if (!env || !env.WHOISXML_API_KEY) return null;
  const data = await fetchJson('https://reverse-whois.whoisxmlapi.com/api/v2', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      apiKey: env.WHOISXML_API_KEY,
      searchType: searchType === 'historic' ? 'historic' : 'current',
      mode: 'purchase',
      basicSearchTerms: { include: [String(term).trim()] },
    }),
  });
  const list = Array.isArray(data && data.domainsList) ? data.domainsList : [];
  return list.map((d) => lc(typeof d === 'string' ? d : d.domainName || d.name)).filter(isDomain);
}

// DomainIQ reverse-WHOIS — best-effort. DomainIQ allowlists by IP (Vercel has no
// static egress), so it needs the Fixie proxy AND the correct reverse service;
// set DOMAINIQ_REVERSE_URL_TEMPLATE ({key},{term}) to enable. Until then this is
// a no-op so it can't break the pull.
async function domainiqReverse(term, env) {
  const tmpl = env && env.DOMAINIQ_REVERSE_URL_TEMPLATE;
  if (!tmpl || !env.DOMAINIQ_API_KEY) return null;
  const url = tmpl.replace('{key}', encodeURIComponent(env.DOMAINIQ_API_KEY)).replace('{term}', encodeURIComponent(String(term).trim()));
  // Route through the static-IP proxy when configured (DomainIQ IP allowlist);
  // fall back to a direct call if no proxy is set.
  const agent = proxyAgent();
  let data;
  if (agent) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await undiciFetch(url, { dispatcher: agent, signal: ctrl.signal, headers: { accept: 'application/json', 'user-agent': 'domain-research/portfolio' } });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} (via proxy): ${text.slice(0, 160)}`);
      try { data = JSON.parse(text); } catch { data = text; }
    } finally { clearTimeout(timer); }
  } else {
    data = await fetchJson(url);
  }
  // Tolerant extraction: DomainIQ reverse responses vary by plan/service.
  const list = (data && (data.domains || data.result || data.data || data.search_result)) || [];
  const arr = Array.isArray(list) ? list : [];
  return arr.map((d) => lc(typeof d === 'string' ? d : d.domain || d.domain_name || d.name)).filter(isDomain);
}

// Pull the union portfolio for a set of derived keys.
//   terms: [{ field:'company'|'email'|'name', term }]
export async function pullPortfolio(terms, { env, maxPages = 100 } = {}) {
  const byDomain = new Map(); // domain → { domain, providers:Set, created, registrar }
  const providerCounts = { whoxy: 0, whoisxml: 0, domainiq: 0 };
  const errors = [];
  let credits = 0;

  const add = (domain, provider, meta) => {
    const d = lc(domain);
    if (!d || !d.includes('.')) return;
    const cur = byDomain.get(d) || { domain: d, providers: new Set(), created: undefined, registrar: undefined };
    cur.providers.add(provider);
    if (meta) { if (meta.created && !cur.created) cur.created = meta.created; if (meta.registrar && !cur.registrar) cur.registrar = meta.registrar; }
    byDomain.set(d, cur);
    providerCounts[provider] += 1;
  };

  // WhoisXML "purchase" mode costs credits, so only run it on the strongest terms
  // (deriveRegistrantKeys orders the derived registrant org/email FIRST and the
  // brand fallback last) — Whoxy (cheap per page) + DomainIQ run on every term.
  const paidTerms = new Set(terms.slice(0, 2).map((t) => `${t.field}:${t.term}`));

  for (const t of terms) {
    // Whoxy (paginated, credit-counted).
    try {
      const r = await reverseWhoisAll({ [t.field]: t.term }, { env, maxPages });
      credits += r.credits_used || 0;
      for (const it of r.domains) add(it.domain, 'whoxy', it);
    } catch (e) { errors.push(`whoxy(${t.field}=${t.term}): ${String(e.message || e)}`); }

    // WhoisXML reverse — current + historic (capped to the strongest terms).
    if (paidTerms.has(`${t.field}:${t.term}`)) {
      for (const st of ['current', 'historic']) {
        try {
          const list = await whoisxmlReverse(t.term, env, st);
          if (list) for (const d of list) add(d, 'whoisxml');
        } catch (e) { errors.push(`whoisxml/${st}(${t.field}=${t.term}): ${String(e.message || e)}`); }
      }
    }

    // DomainIQ — best-effort (no-op unless configured).
    try {
      const list = await domainiqReverse(t.term, env);
      if (list) for (const d of list) add(d, 'domainiq');
    } catch (e) { errors.push(`domainiq(${t.field}=${t.term}): ${String(e.message || e)}`); }
  }

  const domains = [...byDomain.values()].map((d) => ({ domain: d.domain, providers: [...d.providers], created: d.created, registrar: d.registrar }));
  return { domains, total_results: domains.length, provider_counts: providerCounts, credits_used: credits, errors };
}
