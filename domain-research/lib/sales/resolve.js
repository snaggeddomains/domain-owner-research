// Sales Research Agent — RESOLVE + CLASSIFY (Phase 1A spine, mode-agnostic).
//
// Takes raw discovery candidates (from any discovery module) and turns them into
// ranked, qualified prospects:
//   RESOLVE  — name the company + attach firmographics (the ability-to-pay data).
//              For bare tld_variant rows (artificial.co — no company name from
//              discovery) firmographics-by-domain is tried first; when the provider
//              can't name it (verified gap — see SALES_RESEARCH_SPEC.md), fall back to
//              the live site's og:site_name / <title> (free).
//   CLASSIFY — active | for_sale | inactive, reusing the shared live-site clue
//              extractor (parking-platform + "for sale" detection — heavier and more
//              reliable than discovery's lightweight HTTP probe).
//   RANK     — abilityToPay() tier + signals; sort strong → unknown.
//
// COST CONTROL (Apollo credits): firmographics is only called for `active`
// candidates by default (skip for_sale/inactive — bad targets), and a per-run
// company cache means overlapping seeds / re-runs never re-spend on the same domain.
//
// Standalone:  node lib/sales/resolve.js artificial.com

import { pathToFileURL } from 'node:url';
import { fetchText, extractClues } from '../util.js';
import { discoverUpgrade } from './discovery/upgrade.js';
import { firmographics, abilityToPay } from './enrich/firmographics.js';

// Title fragments that are not a company name.
const GENERIC_TITLE = /^(welcome|home ?page|home|index|untitled|404|not found|coming soon|under construction|domain (default|for sale)|account suspended)\b/i;

// Pull a usable company name from a live page: prefer og:site_name, else the most
// brand-like <title> segment (split on - | – — :, drop generic boilerplate).
function nameFromPage(html) {
  const h = String(html || '');
  const og = (h.match(/<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"']{1,80})["']/i)
    || h.match(/<meta[^>]+content=["']([^"']{1,80})["'][^>]*property=["']og:site_name["']/i) || [])[1];
  if (og && og.trim() && !GENERIC_TITLE.test(og.trim())) return og.trim();
  const { title } = extractClues(h);
  if (!title || GENERIC_TITLE.test(title)) return null;
  // "The foundations of … - artificial." → segments; prefer the shortest non-generic
  // segment (brand is usually the terse one), but skip pure generic phrases.
  const segs = title.split(/\s*[|–—\-:·]\s*/).map((s) => s.trim())
    .filter((s) => s && !GENERIC_TITLE.test(s));
  if (!segs.length) return null;
  segs.sort((a, b) => a.length - b.length);
  const pick = segs[0];
  return pick.length <= 60 ? pick.replace(/\.$/, '') : null;
}

// CLASSIFY one domain off its live site (free). Returns { status, page } where page
// carries the fetched clues so RESOLVE can reuse them for the name fallback.
async function classifyLive(domain) {
  let resp;
  try { resp = await fetchText(`https://${domain}/`); }
  catch { try { resp = await fetchText(`http://${domain}/`); } catch { return { status: 'inactive', page: null }; } }
  const clues = extractClues(resp.body || '');
  if (clues.parking?.likely_parked) return { status: 'for_sale', page: clues, html: resp.body };
  if (!resp.ok) return { status: 'inactive', page: clues, html: resp.body };
  return { status: 'active', page: clues, html: resp.body };
}

// Resolve + classify a single candidate. `enrich` gates the paid firmographic call.
export async function resolveCandidate(cand, { env = process.env, enrich = true, cache } = {}) {
  const out = { ...cand };

  // CLASSIFY (free, always) — also gives us the page for the name fallback.
  const { status, html } = await classifyLive(cand.domain);
  out.status = status;

  // RESOLVE name + firmographics. Only spend a credit on viable (active) targets.
  let firmo = null;
  if (enrich && status === 'active') {
    const key = cand.domain;
    if (cache && cache.has(key)) firmo = cache.get(key);
    else { firmo = await firmographics(cand.domain, env); if (cache) cache.set(key, firmo); }
  }
  if (firmo) {
    out.company = firmo.company || out.company;
    out.company_url = firmo.website || `https://${cand.domain}`;
    out.description = firmo.description || out.description;
    out.employee_count = firmo.employees ?? out.employee_count ?? null;
    out.location = firmo.location ?? out.location ?? null;
    out.funding = firmo.funding ?? out.funding ?? null;
    out.firmographics = firmo;
  }
  // Name fallback for still-unnamed ACTIVE rows (the bare tld_variant gap). Skip
  // for_sale/inactive — a parked page's title ("For Sale", broker name) is noise.
  if (!out.company && status === 'active' && html) out.company = nameFromPage(html);

  // RANK — ability-to-pay tier + signals (off firmographics when present).
  out.qualification = abilityToPay(firmo);
  out.score = { strong: 3, medium: 2, low: 1, unknown: 0 }[out.qualification.tier];
  return out;
}

// Bounded-concurrency resolve of a candidate list, then dedupe by company (keep the
// active/best-qualified row per company; merge alt domains onto it).
export async function resolveCandidates(cands, opts = {}) {
  const { concurrency = 4 } = opts;
  const cache = opts.cache || new Map();
  const resolved = new Array(cands.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, cands.length) }, async () => {
    while (i < cands.length) { const idx = i++; resolved[idx] = await resolveCandidate(cands[idx], { ...opts, cache }); }
  }));

  // Dedupe by normalized company name (rows without a company stay distinct).
  const byCompany = new Map();
  const standalone = [];
  for (const r of resolved) {
    const key = r.company ? r.company.toLowerCase().replace(/[^a-z0-9]/g, '') : null;
    if (!key) { standalone.push(r); continue; }
    const prev = byCompany.get(key);
    if (!prev) { byCompany.set(key, { ...r, alt_domains: [] }); continue; }
    // Prefer the higher-scoring / active row; remember the other domain.
    const better = (r.score > prev.score) || (r.status === 'active' && prev.status !== 'active') ? r : prev;
    const other = better === r ? prev : r;
    const merged = { ...better, alt_domains: [...(prev.alt_domains || []), other.domain] };
    byCompany.set(key, merged);
  }
  const tierRank = { strong: 0, medium: 1, low: 2, unknown: 3 };
  return [...byCompany.values(), ...standalone].sort(
    (a, b) => tierRank[a.qualification.tier] - tierRank[b.qualification.tier]
      || (b.employee_count || 0) - (a.employee_count || 0),
  );
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seed = process.argv[2] || 'artificial.com';
  const enrich = !process.argv.includes('--no-enrich');
  console.error(`\nRESOLVE + CLASSIFY for ${seed}${enrich ? '' : ' (--no-enrich: free, no Apollo)'} …\n`);
  const cands = await discoverUpgrade(seed, { classifyStatus: false });
  const rows = await resolveCandidates(cands, { enrich });
  const pad = (s, n) => String(s ?? '').slice(0, n).padEnd(n);
  console.log(pad('COMPANY', 30), pad('DOMAIN', 26), pad('STATUS', 9), pad('TIER', 8), 'WHY');
  console.log('-'.repeat(120));
  for (const r of rows) {
    console.log(pad(r.company || '—', 30), pad(r.domain, 26), pad(r.status, 9),
      pad(r.qualification.tier, 8), (r.qualification.reasons || []).join(' · ').slice(0, 50));
  }
  console.log('-'.repeat(120));
  console.log(`${rows.length} companies (deduped) · ${rows.filter((r) => r.status === 'active').length} active\n`);
}
