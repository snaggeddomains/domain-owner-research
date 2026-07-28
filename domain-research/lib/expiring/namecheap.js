// Namecheap Market auction feed — the public daily CSV of every Namecheap Market
// listing/auction. We only want the `.ai` rows (~5.6k of ~1M), so we STREAM the ~180MB
// file and keep just the .ai lines — never loading the whole thing into memory. Fail-open
// (network/parse error → []). Used by the Expiring .ai cron to flag which watched names
// are already on a Namecheap auction (+ seed new .ai auctions as candidates).

const FEED_URL = 'https://d3ry1h4w5036x1.cloudfront.net/reports/Namecheap_Market_Sales.csv';

// Minimal RFC-ish CSV line parser (handles quoted fields + doubled quotes). The feed is
// well-formed; this is just belt-and-suspenders for a stray comma inside a quoted value.
function parseCsvLine(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const num = (v) => {
  const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const iso = (v) => {
  const s = String(v || '').trim();
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

// → array of { domain, sld, price, end, url } for every .ai row in the feed. Bounded by a
// hard row cap so a runaway feed can't blow memory. Fail-open.
export async function fetchNamecheapAiAuctions({ maxRows = 100000, timeoutMs = 90000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(FEED_URL, { signal: ctrl.signal, headers: { accept: 'text/csv' } });
    if (!res.ok || !res.body) return [];
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let header = null;
    let idxName = -1, idxPrice = -1, idxStart = -1, idxEnd = -1, idxUrl = -1;
    const out = [];
    const seen = new Set();
    let done = false;
    while (!done && out.length < maxRows) {
      const r = await reader.read();
      done = r.done;
      if (r.value) buf += decoder.decode(r.value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).replace(/\r$/, '');
        buf = buf.slice(nl + 1);
        if (!header) {
          header = parseCsvLine(line).map((h) => h.trim());
          idxName = header.indexOf('name'); idxPrice = header.indexOf('price');
          idxStart = header.indexOf('startPrice'); idxEnd = header.indexOf('endDate');
          idxUrl = header.indexOf('url');
          continue;
        }
        // Cheap prefilter before the full parse — skip lines that can't be an .ai name.
        if (!/\.ai(?=[",]|$)/i.test(line)) continue;
        const cells = parseCsvLine(line);
        const domain = String(cells[idxName] || '').trim().toLowerCase();
        if (!domain.endsWith('.ai') || seen.has(domain)) continue;
        const sld = domain.slice(0, -3);
        if (!/^[a-z0-9-]+$/.test(sld)) continue;   // single-label .ai only
        seen.add(domain);
        out.push({
          domain, sld,
          price: num(cells[idxPrice]) || num(cells[idxStart]),
          end: iso(cells[idxEnd]),
          url: String(cells[idxUrl] || '').trim() || null,
        });
        if (out.length >= maxRows) break;
      }
    }
    try { await reader.cancel(); } catch { /* ignore */ }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
