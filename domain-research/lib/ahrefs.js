import { fetchJson } from './util.js';

// Ahrefs (Site Explorer API v3) — the PAID organic-traffic + Domain Rating upgrade
// over Open PageRank on the Sales Hub target list. OPR is a free 0–10 authority
// proxy; Ahrefs gives real estimated monthly organic search traffic + DR (0–100),
// which is a far better read of how prominent/valuable a target company's site is.
//
// Env: AHREF_API_KEY (also accepts AHREFS_API_KEY). Auth = `Authorization: Bearer`.
// Base https://api.ahrefs.com/v3/site-explorer. No batch endpoint — one call per
// target per metric, so we bound the set (max) + run bounded concurrency, and it's
// fully fail-open: no key / any error → {} (the columns just don't populate).
const BASE = 'https://api.ahrefs.com/v3/site-explorer';

const clean = (d) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();

export function ahrefsConfigured(env = process.env) {
  return !!(env.AHREF_API_KEY || env.AHREFS_API_KEY);
}

// today as YYYY-MM-DD (Ahrefs v3 requires a `date` "as of" on both endpoints).
function today() {
  return new Date().toISOString().slice(0, 10);
}

const num = (v) => (v != null && v !== '' && !isNaN(Number(v)) ? Number(v) : null);

// One domain → { traffic, dr, keywords, rank } (any field null on miss). Two calls:
// /metrics (organic traffic + keywords) and /domain-rating (DR + ahrefs global rank).
// Tolerant field parsing (Ahrefs has renamed fields across versions); fail-open per call.
export async function ahrefsOne(domain, env = process.env) {
  const key = env.AHREF_API_KEY || env.AHREFS_API_KEY;
  const target = clean(domain);
  const out = { traffic: null, dr: null, keywords: null, rank: null };
  if (!key || !target) return out;
  const headers = { Authorization: `Bearer ${key}` };
  const date = today();
  // Metrics: estimated organic search traffic + tracked organic keywords for the whole site.
  try {
    const qs = `target=${encodeURIComponent(target)}&date=${date}&mode=subdomains&volume_mode=monthly`;
    const data = await fetchJson(`${BASE}/metrics?${qs}`, { headers });
    const m = (data && (data.metrics || data)) || {};
    out.traffic = num(m.org_traffic ?? m.organic_traffic ?? m.traffic);
    out.keywords = num(m.org_keywords ?? m.organic_keywords ?? m.keywords);
  } catch { /* fail-open */ }
  // Domain Rating (0–100) + Ahrefs global rank.
  try {
    const qs = `target=${encodeURIComponent(target)}&date=${date}`;
    const data = await fetchJson(`${BASE}/domain-rating?${qs}`, { headers });
    const dr = (data && (data.domain_rating || data)) || {};
    out.dr = num(dr.domain_rating ?? dr.dr);
    out.rank = num(dr.ahrefs_rank ?? dr.rank);
  } catch { /* fail-open */ }
  return out;
}

// domains[] → { <domain>: { traffic, dr, keywords, rank } } for the (bounded) set.
// max caps the paid call count; concurrency bounds parallelism. Fail-open → {}.
export async function ahrefsTraffic(domains, env = process.env, { max = 40, concurrency = 4 } = {}) {
  const out = {};
  if (!ahrefsConfigured(env)) return out;
  const list = [...new Set((domains || []).map(clean).filter(Boolean))].slice(0, max);
  let i = 0;
  async function worker() {
    while (i < list.length) {
      const d = list[i++];
      try { out[d] = await ahrefsOne(d, env); } catch { /* fail-open */ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  return out;
}

// ── Full website deep-dive report ────────────────────────────────────────────
// One comprehensive read of a domain from Ahrefs Site Explorer v3. Every section is
// an independent, fail-open call (a section that errors is just omitted + noted in
// `errors[]`), so a partial report always renders. Column names + wrapper keys are
// verified against the v3 docs. NB Ahrefs cost fields (org_cost/cpc/value) are in
// USD CENTS — we divide by 100 to dollars (verify the magnitude on first live run).

function ymd(d) { return d.toISOString().slice(0, 10); }
const cents = (v) => { const n = num(v); return n == null ? null : n / 100; };

async function get(env, path, params) {
  const key = env.AHREF_API_KEY || env.AHREFS_API_KEY;
  const qs = Object.entries(params).filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return fetchJson(`${BASE}/${path}?${qs}`, { headers: { Authorization: `Bearer ${key}` } }, 20000);
}

// Roll the monthly org-traffic series up into per-week/month/quarter/year reads +
// MoM / YoY deltas. Pure — takes the ascending-by-date history rows.
function deriveTrends(history) {
  const rows = (history || []).filter((r) => r && r.org_traffic != null);
  if (!rows.length) return null;
  const t = rows.map((r) => Number(r.org_traffic));
  const last = t[t.length - 1];
  const sumLast = (n) => t.slice(-n).reduce((a, b) => a + b, 0);
  const per_month = last;
  const per_quarter = t.length >= 3 ? sumLast(3) : null;
  const per_year = t.length >= 12 ? sumLast(12) : sumLast(t.length);
  const per_week = last != null ? Math.round(last / 4.345) : null;
  const prev = t.length >= 2 ? t[t.length - 2] : null;
  const yearAgo = t.length >= 13 ? t[t.length - 13] : null;
  const pct = (a, b) => (b && b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : null);
  return { per_week, per_month, per_quarter, per_year, mom_pct: prev != null ? pct(last, prev) : null, yoy_pct: yearAgo != null ? pct(last, yearAgo) : null };
}

export async function ahrefsReport(domain, env = process.env, { country = 'us' } = {}) {
  const target = clean(domain);
  const date = today();
  const out = { domain: target, configured: ahrefsConfigured(env), overview: {}, history: [], trends: null, countries: [], keywords: [], pages: [], refdomains: [], competitors: [], errors: [] };
  if (!out.configured || !target) { if (!out.configured) out.errors.push('no_key'); return out; }
  const fail = (section, e) => out.errors.push(`${section}: ${String((e && e.message) || e).slice(0, 120)}`);

  // date_from = ~3 years back for the monthly traffic history.
  const from = new Date(); from.setFullYear(from.getFullYear() - 3);
  const dateFrom = ymd(from);

  const jobs = [
    // Overview — three object endpoints merged.
    (async () => {
      try {
        const m = (await get(env, 'metrics', { target, date, mode: 'subdomains', volume_mode: 'monthly' })).metrics || {};
        Object.assign(out.overview, {
          org_traffic: num(m.org_traffic), org_keywords: num(m.org_keywords), org_keywords_top3: num(m.org_keywords_1_3),
          org_value_usd: cents(m.org_cost), paid_traffic: num(m.paid_traffic), paid_keywords: num(m.paid_keywords), paid_value_usd: cents(m.paid_cost),
        });
      } catch (e) { fail('metrics', e); }
    })(),
    (async () => {
      try {
        const dr = (await get(env, 'domain-rating', { target, date })).domain_rating || {};
        Object.assign(out.overview, { dr: num(dr.domain_rating), ahrefs_rank: num(dr.ahrefs_rank) });
      } catch (e) { fail('domain-rating', e); }
    })(),
    (async () => {
      try {
        const b = (await get(env, 'backlinks-stats', { target, date, mode: 'subdomains' })).metrics || {};
        Object.assign(out.overview, { backlinks: num(b.live), refdomains: num(b.live_refdomains), all_time_backlinks: num(b.all_time) });
      } catch (e) { fail('backlinks-stats', e); }
    })(),
    // Traffic history (monthly) → time series + derived per-week/month/quarter/year.
    (async () => {
      try {
        const rows = (await get(env, 'metrics-history', { target, date_from: dateFrom, history_grouping: 'monthly', mode: 'subdomains', volume_mode: 'monthly' })).metrics || [];
        out.history = rows.map((r) => ({ date: r.date, org_traffic: num(r.org_traffic), org_value_usd: cents(r.org_cost), paid_traffic: num(r.paid_traffic) }));
        out.trends = deriveTrends(out.history);
      } catch (e) { fail('metrics-history', e); }
    })(),
    // Traffic by country.
    (async () => {
      try {
        const rows = (await get(env, 'metrics-by-country', { target, date, mode: 'subdomains', limit: 12 })).metrics || [];
        out.countries = rows.map((r) => ({ country: r.country, org_traffic: num(r.org_traffic), org_keywords: num(r.org_keywords), org_value_usd: cents(r.org_cost) }))
          .filter((r) => r.org_traffic != null).sort((a, b) => (b.org_traffic || 0) - (a.org_traffic || 0)).slice(0, 10);
      } catch (e) { fail('metrics-by-country', e); }
    })(),
    // Organic keywords it ranks for (top by traffic).
    (async () => {
      try {
        const sel = 'keyword,best_position,volume,cpc,sum_traffic,keyword_difficulty,best_position_url';
        const rows = (await get(env, 'organic-keywords', { target, date, select: sel, order_by: 'sum_traffic:desc', limit: 50, mode: 'subdomains' })).keywords || [];
        out.keywords = rows.map((r) => ({ keyword: r.keyword, position: num(r.best_position), volume: num(r.volume), traffic: num(r.sum_traffic), difficulty: num(r.keyword_difficulty), cpc_usd: cents(r.cpc), url: r.best_position_url }));
      } catch (e) { fail('organic-keywords', e); }
    })(),
    // Top pages by organic traffic.
    (async () => {
      try {
        const sel = 'url,sum_traffic,keywords,top_keyword,top_keyword_volume,referring_domains,value';
        const rows = (await get(env, 'top-pages', { target, date, select: sel, order_by: 'sum_traffic:desc', limit: 30, mode: 'subdomains' })).pages || [];
        out.pages = rows.map((r) => ({ url: r.url, traffic: num(r.sum_traffic), keywords: num(r.keywords), top_keyword: r.top_keyword, top_keyword_volume: num(r.top_keyword_volume), refdomains: num(r.referring_domains), value_usd: cents(r.value) }));
      } catch (e) { fail('top-pages', e); }
    })(),
    // Referring domains (strongest first by DR).
    (async () => {
      try {
        const sel = 'domain,domain_rating,traffic_domain,links_to_target,dofollow_links,first_seen,last_seen';
        const rows = (await get(env, 'refdomains', { target, select: sel, order_by: 'domain_rating:desc', limit: 50, mode: 'subdomains' })).refdomains || [];
        out.refdomains = rows.map((r) => ({ domain: r.domain, dr: num(r.domain_rating), traffic: num(r.traffic_domain), links: num(r.links_to_target), dofollow: num(r.dofollow_links), first_seen: r.first_seen, last_seen: r.last_seen }));
      } catch (e) { fail('refdomains', e); }
    })(),
    // Organic competitors (needs a country).
    (async () => {
      try {
        const sel = 'competitor_domain,domain_rating,keywords_common,keywords_competitor,traffic,pages';
        const rows = (await get(env, 'organic-competitors', { target, country, date, select: sel, order_by: 'keywords_common:desc', limit: 25, mode: 'subdomains' })).competitors || [];
        out.competitors = rows.map((r) => ({ domain: r.competitor_domain, dr: num(r.domain_rating), common_keywords: num(r.keywords_common), keywords: num(r.keywords_competitor), traffic: num(r.traffic), pages: num(r.pages) }));
      } catch (e) { fail('organic-competitors', e); }
    })(),
  ];
  await Promise.all(jobs);
  return out;
}
