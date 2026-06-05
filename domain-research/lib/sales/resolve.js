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
import { discoverUpgrade, seedParts } from './discovery/upgrade.js';
import { firmographics, abilityToPay } from './enrich/firmographics.js';

// Title fragments that are not a company name.
const GENERIC_TITLE = /^(welcome|home ?page|home|index|untitled|404|not found|coming soon|under construction|domain (default|for sale)|account suspended)\b/i;

// Parked / placeholder pages that slip past for-sale detection: registrar default
// pages, "future home of", host parking, blank CMS installs. We DEMOTE these
// (status for_sale → "Others") and never let their junk title become a company name.
const PARKED_MARKERS = /\b(checkdomain|hostinger|unstoppable domains|parked (domain|page|free)|future home of|domain default page|this domain is parked|sedoparking|parking ?crew|courtesy of (the )?domain|buy this domain|domainmarket|this web ?site is parked|website coming soon|godaddy)\b/i;
const PARKED_NAME = /^(it works!?|index of|apache2? (ubuntu )?(default|server)|welcome to nginx|my (blog|wordpress (blog|site))|future home of|parked( domain| page)?|checkdomain parking|parking page|unstoppable domains|domain default page|coming soon|test page|default web site page|hostinger)\b/i;
function looksParked(resp) {
  const head = String(resp.body || '').slice(0, 4000);
  const title = (head.match(/<title[^>]*>([^<]{0,120})<\/title>/i) || [])[1] || '';
  return PARKED_MARKERS.test(head) || PARKED_NAME.test(title.trim());
}

// Firmographic name↔domain mismatch: the provider returned a company whose name
// shares nothing with the domain SLD (e.g. askubuntu.com → "Echo Val-Solution") —
// almost certainly a wrong match, so we flag it low-confidence rather than assert it.
function nameDomainMismatch(company, sld) {
  const s = String(sld || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameNorm = String(company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s || !nameNorm) return false;
  if (nameNorm.includes(s) || s.includes(nameNorm)) return false;
  const tokens = String(company || '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
  if (tokens.some((t) => s.includes(t) || t.includes(s))) return false;
  return true;
}

// Two company names that share no significant token / substring — used to detect a
// provider returning a DIFFERENT company than the one discovery already named.
function namesUnrelated(a, b) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = norm(a); const nb = norm(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return false;
  const toks = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
  if (toks(a).some((t) => nb.includes(t)) || toks(b).some((t) => na.includes(t))) return false;
  return true;
}

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
function looksForSale(resp) {
  const body = String(resp.body || '');
  let host = '';
  try { host = new URL(resp.finalUrl || '').host.replace(/^www\./, ''); } catch { /* ignore */ }
  if (host && SALE_HOSTS.some((h) => host === h || host.endsWith('.' + h))) return true;
  // Afternic/GoDaddy stub: a near-empty page that JS-redirects to a parking
  // lander (e.g. window.location.href="/lander"). The for-sale text is rendered
  // client-side, so the only signal in the raw HTML is the redirect itself.
  if (/location\.(href|replace)\s*[=(]\s*["'][^"']*(\/lander|\/park|for[-_]?sale)/i.test(body.slice(0, 3000))) return true;
  return SALE_PHRASES.test(body.slice(0, 8000));
}

// Pull a usable company name from a live page: prefer og:site_name, else the most
// brand-like <title> segment (split on - | – — :, drop generic boilerplate).
function nameFromPage(html) {
  const h = String(html || '');
  const og = (h.match(/<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"']{1,80})["']/i)
    || h.match(/<meta[^>]+content=["']([^"']{1,80})["'][^>]*property=["']og:site_name["']/i) || [])[1];
  if (og && og.trim() && !GENERIC_TITLE.test(og.trim())) return og.trim();
  const { title } = extractClues(h);
  if (!title || GENERIC_TITLE.test(title) || PARKED_NAME.test(title.trim())) return null;
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
  if (clues.parking?.likely_parked || looksForSale(resp) || looksParked(resp)) return { status: 'for_sale', page: clues, html: resp.body };
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
  // Wrong-match guard: discovery already named this company (autocomplete / operator)
  // but the provider returned a TOTALLY unrelated company for the domain
  // (e.g. videoask.com → "Burnout to All Out"). The firmographics belong to someone
  // else — keep the trustworthy discovery name and drop the bad data, so it shows as
  // "<name> — unqualified" instead of being mislabeled with a stranger's stats.
  if (firmo && firmo.company && cand.company) {
    const { sld } = seedParts(cand.domain);
    if (namesUnrelated(firmo.company, cand.company) && nameDomainMismatch(firmo.company, sld)) {
      firmo = null;
      out.company = cand.company;
      out.mismatch_dropped = true;
    }
  }

  if (firmo) {
    out.company = firmo.company || out.company;
    out.company_url = firmo.website || `https://${cand.domain}`;
    out.description = firmo.description || out.description;
    out.employee_count = firmo.employees ?? out.employee_count ?? null;
    out.location = firmo.location ?? out.location ?? null;
    out.funding = firmo.funding ?? out.funding ?? null;
    out.firmographics = firmo;
    // Low-confidence: no discovery name to anchor on, and the provider's name
    // shares nothing with the domain → keep it but warn (⚠ unverified match).
    if (firmo.company && !cand.company) {
      const { sld } = seedParts(cand.domain);
      if (nameDomainMismatch(firmo.company, sld)) {
        out.firmographics.atp_lowconf = true;
        out.firmographics.atp_lowconf_reason = 'company name doesn’t match the domain';
      }
    }
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
  const { concurrency = 10 } = opts;
  const cache = opts.cache || new Map();
  const resolvedAll = new Array(cands.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, cands.length) }, async () => {
    while (i < cands.length) { const idx = i++; resolvedAll[idx] = await resolveCandidate(cands[idx], { ...opts, cache }); }
  }));

  // Drop dead enumerated probes (affix/tld_variant that didn't resolve to a live
  // site, a company name, or firmographics) so ~80 NXDOMAIN affix tries don't
  // flood the list. name_match rows (from a company index) are always kept.
  const resolved = resolvedAll.filter((r) =>
    r.subtype === 'name_match'
    || r.status === 'active' || r.status === 'for_sale'
    || r.company || r.firmographics,
  );

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
