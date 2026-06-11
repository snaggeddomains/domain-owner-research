import { fetchJson } from './util.js';

// Shared Whoxy Reverse WHOIS client. The `whoxy_reverse` source (lib/sources)
// only grabs page 1 for the agent; the Corporate Portfolios module needs the
// WHOLE portfolio, so this paginates every page with a polite delay, a hard
// page cap (credit guard), and a running credit count.
//
// One Whoxy "credit" is spent per page request (reverse=whois). Pricing is
// ~$10 / 1000 queries, so an unbounded pull of a huge registrant could burn
// real money — `maxPages` is the safety valve.
//
// Search precedence matches the single-page source: email (strongest) >
// company > name > keyword. Provide exactly one.

const BASE = 'https://api.whoxy.com/';
const DEFAULT_DELAY_MS = 500;
const DEFAULT_MAX_PAGES = 100; // ~ up to a few thousand domains; tune per use.

function buildUrl({ key, field, term, page }) {
  const p = new URLSearchParams({ key, reverse: 'whois' });
  p.set(field, term);
  p.set('page', String(page));
  return `${BASE}?${p}`;
}

// Pick the active search field (precedence order) from a loose query object.
export function pickField({ email, company, name, keyword } = {}) {
  if (email && String(email).trim()) return { field: 'email', term: String(email).trim() };
  if (company && String(company).trim()) return { field: 'company', term: String(company).trim() };
  if (name && String(name).trim()) return { field: 'name', term: String(name).trim() };
  if (keyword && String(keyword).trim()) return { field: 'keyword', term: String(keyword).trim() };
  return null;
}

function normalizeItem(r) {
  return {
    domain: String(r.domain_name || '').toLowerCase(),
    created: r.create_date || r.created_date || undefined,
    updated: r.update_date || undefined,
    expires: r.expiry_date || undefined,
    registrar: (r.domain_registrar && r.domain_registrar.registrar_name) || undefined,
  };
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Pull every page of a reverse-WHOIS query. Returns the full (deduped) domain
// list plus metadata (total_results, pages fetched = credits used, whether the
// page cap was hit). `onPage` is an optional progress callback.
//
//   reverseWhoisAll({ company: 'Red Bull Gmbh' }, { env })
export async function reverseWhoisAll(query, { env, maxPages = DEFAULT_MAX_PAGES, delayMs = DEFAULT_DELAY_MS, onPage } = {}) {
  const key = env && env.WHOXY_API_KEY;
  if (!key) throw new Error('WHOXY_API_KEY is not configured');
  const picked = pickField(query);
  if (!picked) throw new Error('Provide one of: email, company, name, keyword');

  const byDomain = new Map();
  let page = 1;
  let totalPages = 1;
  let totalResults = 0;
  let creditsUsed = 0;
  let capped = false;

  while (page <= totalPages) {
    if (page > maxPages) { capped = true; break; }
    const url = buildUrl({ key, field: picked.field, term: picked.term, page });
    const data = await fetchJson(url);
    creditsUsed += 1;

    if (data && Number(data.status) === 0) {
      throw new Error(`Whoxy reverse: ${data.status_reason || 'error'}`);
    }
    if (page === 1) {
      totalPages = Number(data && data.total_pages) || 1;
      totalResults = Number(data && data.total_results) || 0;
    }

    const results = Array.isArray(data && data.search_result) ? data.search_result : [];
    for (const r of results) {
      const item = normalizeItem(r);
      if (item.domain && !byDomain.has(item.domain)) byDomain.set(item.domain, item);
    }
    if (typeof onPage === 'function') onPage({ page, totalPages, found: byDomain.size });

    page += 1;
    if (page <= totalPages && page <= maxPages) await sleep(delayMs);
  }

  return {
    query: picked.term,
    field: picked.field,
    total_results: totalResults || byDomain.size,
    domains: [...byDomain.values()],
    credits_used: creditsUsed,
    pages_fetched: creditsUsed,
    total_pages: totalPages,
    capped, // true if maxPages stopped us before the last page
  };
}
