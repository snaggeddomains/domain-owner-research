// Sales Research — shared live-site classifier (active | for_sale | inactive).
//
// One source of truth for "is this a real operating site, a parked / for-sale
// lander, or dead?" used by BOTH the upgrade resolve path (lib/sales/resolve.js)
// and the keyword/angle + product-name fan-out (lib/sales/discovery/keyword.js),
// so a for-sale domain that happens to return HTTP 200 (e.g. graphicedge.com) is
// never mislabeled "active" on one path while the other catches it.

import { extractClues } from '../util.js';

// Byte-capped fetch: stream the body but stop after maxBytes so a single giant page
// can't blow the function's memory. Discovery fetches a full page per candidate
// (≈180 for a generic seed like "gush") at concurrency, so an uncapped res.text()
// on a huge page OOMed the resolve step (FUNCTION_INVOCATION_FAILED). 768KB is
// plenty for <title>/og:site_name/parking detection.
export async function fetchCapped(url, { timeoutMs = 9000, maxBytes = 768 * 1024 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml,*/*',
        'user-agent': 'Mozilla/5.0 (compatible; domain-research/0.1; +https://research.snagged.com)',
      },
    });
    let body = '';
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let total = 0;
      while (total < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        body += decoder.decode(value, { stream: true });
      }
      try { await reader.cancel(); } catch { /* ignore */ }
    } else {
      body = (await res.text()).slice(0, maxBytes);
    }
    return { status: res.status, ok: res.ok, finalUrl: res.url, body };
  } finally {
    clearTimeout(timer);
  }
}

// Title fragments that are not a company name (also used for the name fallback).
export const GENERIC_TITLE = /^(welcome|home ?page|home|index|untitled|404|not found|coming soon|under construction|domain (default|for sale)|account suspended)\b/i;

// Marketplace / parking hosts a for-sale domain redirects to (a domainer, not a
// buyer). extractClues misses GoDaddy's own landers, so we check these too.
const SALE_HOSTS = [
  'afternic.com', 'sedo.com', 'sedoparking.com', 'dan.com', 'undeveloped.com',
  'bodis.com', 'parkingcrew.net', 'above.com', 'hugedomains.com', 'voodoo.com',
  'sav.com', 'fabulous.com', 'domainmarket.com', 'spaceship.com', 'godaddy.com',
  'atom.com', 'squadhelp.com', 'brandbucket.com', 'efty.com', 'uniregistry.com',
  'porkbun.com', 'dynadot.com', 'namecheap.com',
];
// High-signal for-sale lander phrases (GoDaddy/Afternic/Sedo "is for sale"). These
// are specific enough not to fire on an operating business homepage.
const SALE_PHRASES = /\b(get a price in less than 24 hours|lease to own|buy this domain|this domain (name )?is (for sale|available)|the domain (name )?[\w.-]{0,40} ?is for sale|domain (name )?is for sale|inquire (to|about) (buy|purchas|this domain)|priced to sell|this domain may be for sale|interested in (buying|this domain)|fast transfer)\b/i;
export function looksForSale(resp) {
  const body = String(resp.body || '');
  let host = '';
  try { host = new URL(resp.finalUrl || '').host.replace(/^www\./, ''); } catch { /* ignore */ }
  if (host && SALE_HOSTS.some((h) => host === h || host.endsWith('.' + h))) return true;
  // Afternic/GoDaddy stub: a near-empty page that JS-redirects to a parking lander
  // (e.g. window.location.href="/lander"); the for-sale text is client-rendered, so
  // the only signal in the raw HTML is the redirect itself.
  if (/location\.(href|replace)\s*[=(]\s*["'][^"']*(\/lander|\/park|for[-_]?sale)/i.test(body.slice(0, 3000))) return true;
  return SALE_PHRASES.test(body.slice(0, 8000));
}

// Parked / placeholder pages that slip past for-sale detection: registrar default
// pages, "future home of", host parking, blank CMS installs.
const PARKED_MARKERS = /\b(checkdomain|hostinger|unstoppable domains|parked (domain|page|free)|future home of|domain default page|this domain is parked|sedoparking|parking ?crew|courtesy of (the )?domain|buy this domain|domainmarket|this web ?site is parked|website coming soon|godaddy)\b/i;
export const PARKED_NAME = /^(it works!?|index of|apache2? (ubuntu )?(default|server)|welcome to nginx|my (blog|wordpress (blog|site))|future home of|parked( domain| page)?|checkdomain parking|parking page|unstoppable domains|domain default page|coming soon|test page|default web site page|hostinger)\b/i;
export function looksParked(resp) {
  const head = String(resp.body || '').slice(0, 4000);
  const title = (head.match(/<title[^>]*>([^<]{0,120})<\/title>/i) || [])[1] || '';
  return PARKED_MARKERS.test(head) || PARKED_NAME.test(title.trim());
}

// Pure: classify an already-fetched response → 'active' | 'for_sale' | 'inactive'.
export function classifyResp(resp) {
  const clues = extractClues(resp.body || '');
  if (clues.parking?.likely_parked || looksForSale(resp) || looksParked(resp)) return 'for_sale';
  if (!resp.ok) return 'inactive';
  return 'active';
}

// Fetch + classify (status only) — the lightweight entry point for discovery.
export async function classifyDomain(domain) {
  let resp;
  try { resp = await fetchCapped(`https://${domain}/`); }
  catch { try { resp = await fetchCapped(`http://${domain}/`); } catch { return 'inactive'; } }
  return classifyResp(resp);
}
