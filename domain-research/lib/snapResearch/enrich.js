// SNAP Research enrichment — gather the abandonment + value clues for one <word>.com and score
// it. Cost-smart: the cheap abandonment clues (live-site + Wayback + NS) run first; the paid
// VALUE probe (popular-TLD count) runs ONLY when the name already looks abandoned, so we don't
// do 26 DNS probes × 98k words. All steps fail-open.

import dns from 'node:dns/promises';
import { fetchText, extractClues } from '../util.js';
import { popularTldCount, countRegistrations } from '../evaluate/tldcount.js';
import { valueScore, abandonScore, combinedScore, isCandidate, TLD_PROBE_ABANDON_MIN } from './score.js';

const UA = 'Mozilla/5.0 (compatible; SnaggedResearch/1.0)';
const YEAR = new Date().getUTCFullYear();

// A name that's ACTIVELY LISTED FOR SALE (retail marketplace / priced lander / "inquire")
// is being marketed by the owner → out of our bargain-hunt range → DISQUALIFY (it's not an
// abandoned dig-up-the-owner buy). Detected two ways: marketplace NAMESERVERS (catches a
// JS-only Afternic/Dan/Atom lander we can't read) and for-sale LANDERS/phrases on the page.
// NB ad-only parking (bodis/parkingcrew) is NOT here — a plain parked page with no sale
// listing can still be a cheap owner buy, so it stays a `parked` candidate.
const FOR_SALE_NS = ['dan.com', 'undeveloped.com', 'atom.com', 'afternic.com', 'above.com', 'sedo.com', 'sedoparking.com', 'hugedomains.com', 'sav.com', 'efty.com', 'domainmarket.com', 'fabulous.com', 'epik.com', 'brandbucket.com', 'squadhelp.com'];
const FOR_SALE_HOST_HINTS = ['afternic.com', 'sedo.com', 'dan.com', 'atom.com', 'hugedomains.com', 'domainmarket.com', 'efty.com', 'sav.com', 'fabulous.com', 'buydomains.com', 'brandbucket.com', 'squadhelp.com', 'godaddy.com/domainsearch', 'domainagents.com'];
const FOR_SALE_PHRASES = [
  'domain is for sale', 'this domain is for sale', 'domain for sale', 'domain name is for sale', 'buy this domain',
  'domain may be for sale', 'this domain may be for sale', 'make an offer', 'make offer', 'inquire about this domain',
  'for inquiries', 'available for purchase', 'purchase this domain', 'interested in buying', 'this domain is available for',
  'the domain you are looking for is for sale', 'domain is available for sale', 'get this domain', 'contact us to purchase',
];
function nsIsForSale(ns) {
  return (ns || []).some((h) => {
    const l = String(h || '').toLowerCase();
    return FOR_SALE_NS.some((s) => l === s || l.endsWith('.' + s));
  });
}

async function inspect(domain) {
  for (const url of [`https://${domain}`, `http://${domain}`]) {
    try {
      const r = await fetchText(url, { headers: { 'user-agent': UA } }, 9000);
      if (r && r.body != null) return r; // { status, ok, finalUrl, body }
    } catch { /* try http */ }
  }
  return null;
}

function classify(res, ns) {
  const nsForSale = nsIsForSale(ns);
  if (!res) {
    // No readable page. Marketplace NS → it's a (JS-only) for-sale lander → disqualify;
    // otherwise the valuable word simply doesn't resolve.
    if (nsForSale) return { site_status: 'for_sale', title: null, stale: false, staleYear: null };
    return { site_status: 'no_resolve', title: null, stale: false, staleYear: null };
  }
  const clues = extractClues(res.body || '');
  const htmlLower = String(res.body || '').toLowerCase();
  const textLower = htmlLower.replace(/<[^>]+>/g, ' ');
  const landerHost = FOR_SALE_HOST_HINTS.some((h) => htmlLower.includes(h)) || (clues.parking?.platforms || []).length > 0;
  const forSalePhrase = (clues.parking?.for_sale_signals || []).length > 0 || FOR_SALE_PHRASES.some((p) => textLower.includes(p));
  const forSale = nsForSale || landerHost || forSalePhrase;
  const parked = !!clues.parking?.likely_parked;
  // Copyright/footer year → staleness.
  let staleYear = null, stale = false;
  const years = clues.copyright ? (clues.copyright.match(/20[0-2]\d/g) || []).map(Number) : [];
  if (years.length) { staleYear = Math.max(...years); if (YEAR - staleYear >= 3) stale = true; }
  let site_status = 'active';
  if (forSale) site_status = 'for_sale';                 // actively marketed → disqualified downstream
  else if (parked) site_status = 'parked';
  else if (!res.body || res.body.replace(/\s+/g, '').length < 200) site_status = 'parked'; // empty/near-empty = a holding page
  return { site_status, title: clues.title || null, stale, staleYear };
}

async function wayback(domain) {
  try {
    const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&fl=timestamp&collapse=timestamp:6&limit=300`;
    const r = await fetchText(url, {}, 12000);
    if (!r || !r.ok || !r.body) return { first: null, last: null, count: 0 };
    let rows;
    try { rows = JSON.parse(r.body); } catch { return { first: null, last: null, count: 0 }; }
    rows = Array.isArray(rows) ? rows.slice(1) : []; // drop the header row
    if (!rows.length) return { first: null, last: null, count: 0 };
    const ts = rows.map((x) => x[0]).filter((t) => /^\d{8}/.test(t || '')).sort();
    if (!ts.length) return { first: null, last: null, count: 0 };
    const toDate = (t) => `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
    return { first: toDate(ts[0]), last: toDate(ts[ts.length - 1]), count: rows.length };
  } catch { return { first: null, last: null, count: 0 }; }
}

async function nameservers(domain) {
  try { return (await dns.resolveNs(domain)).slice(0, 4); } catch { return []; }
}

// Enrich one row (from dueForScan): { domain, word, zipf, wlen, tld_count }. Returns a patch
// to persist.
export async function enrichOne(row, { env = process.env } = {}) {
  const { domain, word } = row;
  const res = await inspect(domain);
  const ns = await nameservers(domain);
  const cls = classify(res, ns);
  const wb = await wayback(domain);

  const forSale = cls.site_status === 'for_sale'; // actively marketed at retail → disqualified
  const unchangedYears = (wb.first && wb.last)
    ? Math.max(0, (Date.parse(wb.last) - Date.parse(wb.first)) / (365.25 * 864e5)) : 0;
  const staleYearsAgo = cls.staleYear ? (YEAR - cls.staleYear) : 0;
  const abandon = abandonScore({ siteStatus: cls.site_status, stale: cls.stale, staleYearsAgo, unchangedYears });

  // VALUE demand signal = the CHEAP popular-TLD probe (~26 DNS), which keeps the 98k-word walk
  // fast. Only when it already looks abandoned AND isn't for-sale.
  let popCount = row.tld_count ?? null;
  const worthProbing = !forSale && abandon >= TLD_PROBE_ABANDON_MIN;
  if (worthProbing && popCount == null) {
    try { const t = await popularTldCount(word, { env }); popCount = t?.count ?? null; } catch { /* fail-open */ }
  }
  const value = valueScore({ tldCount: popCount, zipf: row.zipf, wlen: row.wlen });
  // A for-sale name is NEVER a candidate — the owner is marketing it at retail, out of our
  // bargain-hunt range. Everything else needs both axes high.
  const candidate = !forSale && isCandidate(value, abandon);
  // For a CANDIDATE (rare), replace the displayed count with the FULL ~1,590-IANA-TLD count so
  // the "TLDs" column matches the standalone TLD Count tool exactly (across → 151, not 20/26).
  // Bounded to candidates to keep the scan cheap; countRegistrations is cached (kind `tc`).
  let tldCount = popCount;
  if (candidate) {
    try { const f = await countRegistrations(word, { env }); if (f && Number.isFinite(f.count)) tldCount = f.count; } catch { /* keep the popular count */ }
  }

  return {
    site_status: cls.site_status,
    site_title: cls.title,
    stale: cls.stale,
    stale_year: cls.staleYear,
    wayback_first: wb.first,
    wayback_last: wb.last,
    wayback_count: wb.count,
    unchanged_years: Number(unchangedYears.toFixed(1)),
    nameservers: ns,
    tld_count: tldCount,
    value_score: value,
    abandon_score: abandon,
    score: combinedScore(value, abandon),
    candidate,
    checked_stage: worthProbing && tldCount != null ? 'full' : 'abandon',
    last_checked: new Date().toISOString(),
  };
}
