import { fetchJson } from './util.js';

// Open PageRank (DomCop) — a FREE domain-authority signal (0–10) + global rank,
// used as a "prominence"/traffic proxy on the Sales Hub target list. NOT true
// visit counts (that's Ahrefs/Similarweb, paid) — it's a backlink/authority rank
// that correlates with traffic. Batched (100 domains/request), header-auth, and
// fully fail-open: no key or an API error → {} (the column just doesn't populate).
//
// Env: OPENPAGERANK_API_KEY (header `API-OPR`).
const ENDPOINT = 'https://openpagerank.com/api/v1.0/getPageRank';

const clean = (d) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();

// domains[] → { <domain>: { opr: number|null, rank: number|null } } for every
// domain we could resolve (missing/unranked → nulls). Fail-open per batch.
export async function openPageRank(domains, env = process.env) {
  const key = env.OPENPAGERANK_API_KEY || env.OPEN_PAGE_RANK_API_KEY;
  const out = {};
  if (!key) return out;
  const list = [...new Set((domains || []).map(clean).filter(Boolean))];
  for (let i = 0; i < list.length; i += 100) {
    const batch = list.slice(i, i + 100);
    const qs = batch.map((d) => `domains[]=${encodeURIComponent(d)}`).join('&');
    try {
      const data = await fetchJson(`${ENDPOINT}?${qs}`, { headers: { 'API-OPR': key } });
      const rows = Array.isArray(data && data.response) ? data.response : [];
      for (const r of rows) {
        const dom = clean(r.domain);
        if (!dom) continue;
        const opr = (r.page_rank_decimal != null && r.page_rank_decimal !== '') ? Number(r.page_rank_decimal) : null;
        const rn = r.rank;
        const rank = (rn != null && rn !== '' && String(rn) !== '0' && !isNaN(Number(rn))) ? Number(rn) : null;
        out[dom] = { opr: (opr != null && isFinite(opr)) ? opr : null, rank };
      }
    } catch { /* fail-open: leave this batch's domains unset */ }
  }
  return out;
}
