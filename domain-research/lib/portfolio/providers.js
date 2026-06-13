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
// Recursively harvest every domain-looking string from an arbitrary JSON blob —
// resilient to DomainIQ's exact response field names (which vary by service/plan).
function harvestDomains(node, out) {
  if (node == null) return;
  if (typeof node === 'string') { if (isDomain(node)) out.add(lc(node)); return; }
  if (Array.isArray(node)) { for (const x of node) harvestDomains(x, out); return; }
  if (typeof node === 'object') { for (const k of Object.keys(node)) harvestDomains(node[k], out); }
}

// DomainIQ owner→domains report service per key field (confirmed from /api_docs:
// organization_report/email_report/name_report, param organization/email/name).
const DIQ_SERVICE = { company: ['organization_report', 'organization'], name: ['name_report', 'name'], email: ['email_report', 'email'] };

async function domainiqReverse(field, term, env) {
  if (!env || !env.DOMAINIQ_API_KEY) return null;
  const key = env.DOMAINIQ_API_KEY;
  const t = String(term).trim();
  let url;
  if (env.DOMAINIQ_REVERSE_URL_TEMPLATE) {
    // Optional override ({key},{term},{type}); otherwise use the entity report.
    const type = ({ company: 'org', name: 'name', email: 'email' })[field] || 'org';
    url = String(env.DOMAINIQ_REVERSE_URL_TEMPLATE)
      .replace('{key}', encodeURIComponent(key)).replace('{term}', encodeURIComponent(t)).replace('{type}', encodeURIComponent(type));
  } else {
    const [service, param] = DIQ_SERVICE[field] || DIQ_SERVICE.company;
    url = `https://www.domainiq.com/api?key=${encodeURIComponent(key)}&service=${service}&${param}=${encodeURIComponent(t)}&output_mode=json`;
  }
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
  // Harvest domains from whatever shape comes back (best-effort, schema-agnostic).
  const out = new Set();
  harvestDomains(data, out);
  return [...out];
}

// Pull the union portfolio for a set of derived keys.
//   terms: [{ field:'company'|'email'|'name', term }]
export async function pullPortfolio(terms, { env, maxPages = 100 } = {}) {
  const byDomain = new Map(); // domain → { domain, providers:Set, created, registrar }
  const providerCounts = { whoxy: 0, whoisxml: 0, domainiq: 0 };
  const errors = [];
  let credits = 0;

  const add = (domain, provider, term, meta) => {
    const d = lc(domain);
    if (!d || !d.includes('.')) return;
    const cur = byDomain.get(d) || { domain: d, providers: new Set(), terms: new Set(), created: undefined, registrar: undefined };
    cur.providers.add(provider);
    if (term) cur.terms.add(term); // the registrant key that linked this domain to the seed (provenance)
    if (meta) { if (meta.created && !cur.created) cur.created = meta.created; if (meta.registrar && !cur.registrar) cur.registrar = meta.registrar; }
    byDomain.set(d, cur);
    providerCounts[provider] += 1;
  };

  // WhoisXML "purchase" mode costs credits, so only run it on the strongest terms
  // (deriveRegistrantKeys orders the derived registrant org/email FIRST and the
  // brand fallback last) — Whoxy (cheap per page) + DomainIQ run on every term.
  const paidTerms = new Set(terms.slice(0, 2).map((t) => `${t.field}:${t.term}`));

  for (const t of terms) {
    const label = t.fallback ? `${t.term} (brand)` : t.term; // provenance label

    // Whoxy (paginated, credit-counted).
    try {
      const r = await reverseWhoisAll({ [t.field]: t.term }, { env, maxPages });
      credits += r.credits_used || 0;
      for (const it of r.domains) add(it.domain, 'whoxy', label, it);
    } catch (e) { errors.push(`whoxy(${t.field}=${t.term}): ${String(e.message || e)}`); }

    // WhoisXML reverse — current + historic (capped to the strongest terms).
    if (paidTerms.has(`${t.field}:${t.term}`)) {
      for (const st of ['current', 'historic']) {
        try {
          const list = await whoisxmlReverse(t.term, env, st);
          if (list) for (const d of list) add(d, 'whoisxml', label);
        } catch (e) { errors.push(`whoisxml/${st}(${t.field}=${t.term}): ${String(e.message || e)}`); }
      }
    }

    // DomainIQ — best-effort (no-op unless a reverse template is configured).
    try {
      const list = await domainiqReverse(t.field, t.term, env);
      if (list) for (const d of list) add(d, 'domainiq', label);
    } catch (e) { errors.push(`domainiq(${t.field}=${t.term}): ${String(e.message || e)}`); }
  }

  const domains = [...byDomain.values()].map((d) => ({ domain: d.domain, providers: [...d.providers], matched_via: [...d.terms].join(' · '), created: d.created, registrar: d.registrar }));
  return { domains, total_results: domains.length, provider_counts: providerCounts, credits_used: credits, errors };
}
