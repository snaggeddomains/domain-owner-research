// Strip scheme/path/www and lowercase, so users can paste a full URL.
// Also defends against invisible Unicode characters that survive String.trim()
// but break the strict [a-z0-9-] regex in isValidDomain — most often picked up
// when users paste from docs, Slack, or iOS autocorrect (zero-width joiners,
// non-breaking spaces, byte-order marks). NFKC normalizes fullwidth Latin
// characters (e.g. ｐｒｉｍｅｏ → primeo) to ASCII so they validate cleanly too.
export function normalizeDomain(input) {
  return String(input || '')
    .normalize('NFKC')
    // \s catches ASCII + most Unicode whitespace; ​-‍﻿ are
    // zero-width chars NOT in \s;   is non-breaking space (also not in \s
    // in some engines). Strip every flavor of invisible whitespace.
    .replace(/[\s\u00A0\u200B-\u200F\u2060\uFEFF]/g, '')
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
}

// Validate as a hostname BEFORE it is ever interpolated into an API URL.
// This is the SSRF / injection guard for the templated premium sources.
export function isValidDomain(domain) {
  return (
    typeof domain === 'string' &&
    /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i.test(domain)
  );
}

// fetch + JSON parse with a hard timeout, so one slow API can't hang the function.
export async function fetchJson(url, opts = {}, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { accept: 'application/json', 'user-agent': 'domain-research/0.1', ...(opts.headers || {}) },
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
      throw new Error(`HTTP ${res.status} from ${new URL(url).host}: ${snippet}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

// fetch HTML/text (does NOT throw on non-2xx — a parked page may be a 200, a
// 403, etc. and we still want to read it). Returns the final URL after redirects.
export async function fetchText(url, opts = {}, timeoutMs = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...opts,
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml,*/*',
        'user-agent': 'Mozilla/5.0 (compatible; domain-research/0.1; +https://research.snagged.com)',
        ...(opts.headers || {}),
      },
    });
    const body = await res.text();
    return { status: res.status, ok: res.ok, finalUrl: res.url, body };
  } finally {
    clearTimeout(timer);
  }
}

// Extract ownership clues from a page's HTML — used for both the live site and
// archived Wayback snapshots. Pure string parsing (no DOM dependency).
export function extractClues(html) {
  const h = String(html || '');
  const text = h
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const uniq = (arr, n) => [...new Set(arr)].slice(0, n);

  const title = (h.match(/<title[^>]*>([^<]{0,200})<\/title>/i) || [])[1]?.trim() || null;
  const description =
    (h.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']{0,300})["']/i) || [])[1]?.trim() || null;

  const emails = uniq(
    (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).filter(
      (e) => !/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(e),
    ),
    20,
  );

  const social_links = uniq(
    h.match(
      /https?:\/\/(?:www\.)?(?:linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|youtube\.com)\/[^\s"'<>)]+/gi,
    ) || [],
    20,
  );

  const ga = uniq(h.match(/\b(?:UA-\d{4,}-\d+|G-[A-Z0-9]{6,})\b/g) || [], 10);
  const gtm = uniq(h.match(/\bGTM-[A-Z0-9]{4,}\b/g) || [], 10);
  const meta_pixel = uniq(
    (h.match(/fbq\(\s*['"]init['"]\s*,\s*['"](\d{6,})['"]/g) || [])
      .map((m) => (m.match(/(\d{6,})/) || [])[1])
      .filter(Boolean),
    10,
  );

  const copyright = (text.match(/(?:©|&copy;|copyright)\s*[^.<\n]{0,80}/i) || [])[0]?.trim() || null;

  const lower = h.toLowerCase();
  // Parker platforms must be matched as DOMAINS (with TLD), not bare brand words —
  // a bare 'sedo'/'efty' substring-matches common minified-JS tokens (mouseDown →
  // "mou·sedo·wn", purchasedOn → "purcha·sedo·n", hefty, parsedObj…), which falsely
  // flagged live JS-heavy sites (modulate.ai, cycling74.com) as parked/for-sale.
  const PARKERS = ['above.com', 'afternic.com', 'sedo.com', 'sedoparking.com', 'bodis.com', 'parkingcrew.net', 'dan.com', 'uniregistry.com', 'hugedomains.com', 'domainmarket.com', 'efty.com'];
  const platforms = PARKERS.filter((p) => lower.includes(p));
  // Match for-sale phrases against VISIBLE text only (not raw HTML/JSON/script) so a
  // string buried in a script bundle can't trip it.
  const lowerText = text.toLowerCase();
  const FOR_SALE = ['buy this domain', 'domain is for sale', 'this domain is for sale', 'make an offer', 'inquire about this domain', 'domain for sale'];
  const for_sale_signals = FOR_SALE.filter((p) => lowerText.includes(p));

  return {
    title,
    description,
    emails,
    social_links,
    analytics_ids: { ga, gtm, meta_pixel },
    copyright,
    parking: { likely_parked: platforms.length > 0 || for_sale_signals.length > 0, platforms, for_sale_signals },
    text_excerpt: text.slice(0, 600),
  };
}
