// DomainScout API client (https://www.domainscout.io/api/v1/domains).
//
// DomainScout is a domain-monitoring service: you track domains and it reports,
// per marketplace, whether each is listed for sale (price, currency). We use it
// for two things:
//   1. Tracking — every domain we run a Domain Owner report on is POSTed into the
//      watchlist (replaces the old manual "Add to DomainScout" bookmarklet).
//   2. The report's "For sale" strip — a single GET returns the authoritative
//      per-marketplace listing state across MANY marketplaces (Afternic, Sedo,
//      GoDaddy, Namecheap, Sav, Spaceship, Atom, Dan/Efty, …), replacing our
//      best-effort page-scraping check.
//
// API access requires the Hunter plan; a token on a lesser plan gets 403. The
// token is a Sanctum personal access token sent as a Bearer header. It's a flat
// monthly subscription (no per-call credit), so this is treated as a FREE source.

const BASE = 'https://www.domainscout.io/api/v1/domains';

export function apiKey(env = {}) {
  return env.DOMAINSCOUT_KEY || env.DOMAINSCOUT_API_KEY || '';
}

export function isConfigured(env = {}) {
  return Boolean(apiKey(env));
}

async function call(path, { method = 'GET', body, env, timeoutMs = 12000 } = {}) {
  const key = apiKey(env);
  if (!key) throw new Error('DomainScout is not configured (set DOMAINSCOUT_KEY)');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        authorization: `Bearer ${key}`,
        accept: 'application/json',
        // DomainScout sits behind Cloudflare, which 403s some default client
        // UAs (error 1010). Send an explicit, normal User-Agent.
        'user-agent': 'snagged-research/1.0 (+https://snagged.com)',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, ok: res.ok, body: json };
  } finally {
    clearTimeout(timer);
  }
}

// Per-marketplace listing-page / search URL so a "listed" pill can deep-link the
// user to the actual offer. The API may itself return a `url`; that wins when
// present. Unknown marketplaces fall back to no link.
function marketplaceUrl(name, domain) {
  const slug = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const d = encodeURIComponent(domain);
  const label = String(domain || '').split('.')[0];
  const map = {
    afternic: `https://www.afternic.com/domain/${domain}`,
    sedo: `https://sedo.com/search/?keyword=${d}`,
    godaddy: `https://www.godaddy.com/domainsearch/find?domainToCheck=${d}`,
    namecheap: `https://www.namecheap.com/market/?term=${d}`,
    sav: `https://www.sav.com/${domain}`,
    spaceship: `https://www.spaceship.com/domain-search/?query=${d}&tab=domains`,
    atom: `https://www.atom.com/name/${encodeURIComponent(label)}`,
    squadhelp: `https://www.atom.com/name/${encodeURIComponent(label)}`,
    dan: `https://dan.com/buy-domain/${domain}`,
    efty: `https://${domain}`,
    hugedomains: `https://www.hugedomains.com/domain_profile.cfm?d=${d}`,
    dynadot: `https://www.dynadot.com/domain/search?domain=${d}`,
    flippa: `https://flippa.com/search?search_template=domains&q[query]=${d}`,
  };
  return map[slug] || null;
}

// Normalize the per-marketplace array into a stable shape for the UI/agent.
function normalizeMarketplaces(list, domain) {
  if (!Array.isArray(list)) return [];
  return list.map((m) => {
    const name = m && (m.name || m.marketplace || m.platform) || '';
    const price = m && (m.price != null ? Number(m.price) : null);
    return {
      name: String(name),
      listed: Boolean(m && (m.listed ?? m.for_sale ?? m.is_listed)),
      price: Number.isFinite(price) ? price : null,
      currency: (m && (m.currency || m.price_currency)) || null,
      url: (m && (m.url || m.link)) || marketplaceUrl(name, domain) || null,
    };
  }).filter((m) => m.name);
}

// Start monitoring a domain. Idempotent from the caller's POV: a 201 (created),
// a 200, or a 409/422 "already tracked" all count as success. Never throws —
// returns a small status object so callers can fire-and-forget.
export async function trackDomain(domain, env = {}) {
  const d = String(domain || '').trim().toLowerCase();
  if (!d) return { ok: false, reason: 'no-domain' };
  if (!isConfigured(env)) return { ok: false, reason: 'not-configured' };
  try {
    const r = await call('', { method: 'POST', body: { domain: d }, env });
    // 201 created, 200 ok, or an "already exists" style conflict → tracked.
    const already = r.status === 409 || r.status === 422;
    return { ok: r.ok || already, status: r.status, already, body: r.body };
  } catch (e) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

// Fetch a domain's per-marketplace for-sale state. If it isn't tracked yet
// (404), optionally add it then re-fetch (DomainScout only has marketplace data
// for domains it monitors). Returns a normalized result.
export async function lookupDomain(domain, env = {}, { track = true } = {}) {
  const d = String(domain || '').trim().toLowerCase();
  if (!d) throw new Error('Provide a domain');
  if (!isConfigured(env)) throw new Error('DomainScout is not configured (set DOMAINSCOUT_KEY)');

  let r = await call(`/${encodeURIComponent(d)}`, { env });
  if (r.status === 404 && track) {
    await trackDomain(d, env);
    r = await call(`/${encodeURIComponent(d)}`, { env });
  }
  if (r.status === 403) throw new Error('DomainScout API returned 403 — the token needs the Hunter plan');
  if (!r.ok) {
    if (r.status === 404) {
      // Tracked just now but no scan data yet — return an empty, not-an-error result.
      return { domain: d, tracked: track, for_sale: false, marketplaces: [], pending: true };
    }
    const snippet = typeof r.body === 'string' ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 200);
    throw new Error(`DomainScout HTTP ${r.status}: ${snippet}`);
  }
  const data = (r.body && r.body.data) || r.body || {};
  const marketplaces = normalizeMarketplaces(data.marketplaces, d);
  return {
    domain: data.domain || d,
    tracked: true,
    status: data.status || null,
    for_sale: marketplaces.some((m) => m.listed) || Boolean(data.for_sale),
    marketplaces,
  };
}
