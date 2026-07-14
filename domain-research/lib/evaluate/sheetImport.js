// Read a list of domains (+ optional prices) from a Google Sheets link for Bulk Eval.
// Uses the sheet's public CSV export (no Google creds needed) — works for any sheet
// shared "anyone with the link can view" (or published). Auto-detects which column
// holds the domains and which holds the price, so header names don't matter.

const DOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

// Build the CSV-export URL from any Google Sheets link (edit/view/#gid=…).
function csvExportUrl(url) {
  const s = String(url || '').trim();
  const idm = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idm) return null;
  const id = idm[1];
  // Only pin a gid when the link actually carries one. Forcing gid=0 breaks any
  // sheet whose first tab isn't gid 0 (deleted/recreated first tab) — Google
  // returns HTTP 400. With no gid, /export exports the first sheet, which is what
  // we want for a plain sheet link.
  const gidm = s.match(/[#&?]gid=(\d+)/);
  const base = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  return gidm ? `${base}&gid=${gidm[1]}` : base;
}

// Minimal RFC-4180-ish CSV parser (handles quoted fields + embedded commas/newlines).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const cleanDomain = (v) => String(v || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
const parsePrice = (v) => { const n = Number(String(v || '').replace(/[$,\s]/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };

// Fetch + parse → { names:[{domain,price}], count } or throws a clear error.
export async function fetchSheetNames(url, { max = 500 } = {}) {
  const exportUrl = csvExportUrl(url);
  if (!exportUrl) throw new Error('That doesn\'t look like a Google Sheets link.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  let text;
  try {
    const res = await fetch(exportUrl, { signal: ctrl.signal, redirect: 'follow' });
    text = await res.text();
    if (!res.ok) throw new Error(`sheet returned HTTP ${res.status}`);
  } catch (e) {
    throw new Error(`Couldn't read the sheet (${String((e && e.message) || e)}). Make sure it's shared "anyone with the link can view".`);
  } finally {
    clearTimeout(timer);
  }
  // A private sheet redirects to an HTML sign-in page instead of CSV.
  if (/^\s*<(?:!doctype|html)/i.test(text)) {
    throw new Error('The sheet isn\'t public — set sharing to "anyone with the link can view" (or publish it), then try again.');
  }

  const rows = parseCsv(text).filter((r) => r.some((c) => String(c || '').trim()));
  if (!rows.length) throw new Error('The sheet appears to be empty.');
  const width = Math.max(...rows.map((r) => r.length));

  // Domain column = the one with the most domain-shaped cells.
  let domainCol = -1;
  let bestDomains = 0;
  for (let c = 0; c < width; c++) {
    let n = 0;
    for (const r of rows) if (DOMAIN_RE.test(cleanDomain(r[c]))) n++;
    if (n > bestDomains) { bestDomains = n; domainCol = c; }
  }
  if (domainCol < 0 || !bestDomains) throw new Error('No column of domains found in the sheet.');

  // Price column = the most money-dense OTHER column (may be none).
  let priceCol = -1;
  let bestPrices = 0;
  for (let c = 0; c < width; c++) {
    if (c === domainCol) continue;
    let n = 0;
    for (const r of rows) if (parsePrice(r[c]) != null) n++;
    if (n > bestPrices) { bestPrices = n; priceCol = c; }
  }

  const seen = new Set();
  const names = [];
  for (const r of rows) {
    const domain = cleanDomain(r[domainCol]);
    if (!DOMAIN_RE.test(domain) || seen.has(domain)) continue;
    seen.add(domain);
    names.push({ domain, price: priceCol >= 0 ? parsePrice(r[priceCol]) : null });
    if (names.length >= max) break;
  }
  if (!names.length) throw new Error('No domains found in the sheet.');
  return { names, count: names.length, priced: priceCol >= 0 && bestPrices > 0 };
}

export default { fetchSheetNames };
