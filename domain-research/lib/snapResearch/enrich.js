// SNAP Research enrichment — gather the abandonment + value clues for one <word>.com and score
// it. Cost-smart: the cheap abandonment clues (live-site + Wayback + NS) run first; the paid
// VALUE probe (popular-TLD count) runs ONLY when the name already looks abandoned, so we don't
// do 26 DNS probes × 98k words. All steps fail-open.

import dns from 'node:dns/promises';
import { fetchText, extractClues } from '../util.js';
import { popularTldCount } from '../evaluate/tldcount.js';
import { valueScore, abandonScore, combinedScore, isCandidate, TLD_PROBE_ABANDON_MIN } from './score.js';

const UA = 'Mozilla/5.0 (compatible; SnaggedResearch/1.0)';
const YEAR = new Date().getUTCFullYear();

async function inspect(domain) {
  for (const url of [`https://${domain}`, `http://${domain}`]) {
    try {
      const r = await fetchText(url, { headers: { 'user-agent': UA } }, 9000);
      if (r && r.body != null) return r; // { status, ok, finalUrl, body }
    } catch { /* try http */ }
  }
  return null;
}

function classify(res) {
  if (!res) return { site_status: 'no_resolve', title: null, stale: false, staleYear: null };
  const clues = extractClues(res.body || '');
  const forSale = (clues.parking?.for_sale_signals || []).length > 0;
  const parked = !!clues.parking?.likely_parked;
  // Copyright/footer year → staleness.
  let staleYear = null, stale = false;
  const years = clues.copyright ? (clues.copyright.match(/20[0-2]\d/g) || []).map(Number) : [];
  if (years.length) { staleYear = Math.max(...years); if (YEAR - staleYear >= 3) stale = true; }
  let site_status = 'active';
  if (forSale) site_status = 'for_sale';
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
  const cls = classify(res);
  const wb = await wayback(domain);
  const ns = await nameservers(domain);

  const unchangedYears = (wb.first && wb.last)
    ? Math.max(0, (Date.parse(wb.last) - Date.parse(wb.first)) / (365.25 * 864e5)) : 0;
  const staleYearsAgo = cls.staleYear ? (YEAR - cls.staleYear) : 0;
  const abandon = abandonScore({ siteStatus: cls.site_status, stale: cls.stale, staleYearsAgo, unchangedYears });

  // VALUE probe (paid-ish DNS) only when it already looks abandoned.
  let tldCount = row.tld_count ?? null;
  const worthProbing = abandon >= TLD_PROBE_ABANDON_MIN;
  if (worthProbing && tldCount == null) {
    try { const t = await popularTldCount(word, { env }); tldCount = t?.count ?? null; } catch { /* fail-open */ }
  }
  const value = valueScore({ tldCount, zipf: row.zipf, wlen: row.wlen });
  const candidate = isCandidate(value, abandon);

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
