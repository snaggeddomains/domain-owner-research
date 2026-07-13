// Company Vitals — a dedicated "how alive is this company" read for the Domain Owner
// report, so we can gauge whether a name is pry-able. Two tiers:
//   • Aliveness (FREE): newest Wayback snapshot + age, email (MX) active, live-site
//     reachable/parked — cheap "is anyone home" signals.
//   • Company profile (PAID, Apollo ~1 credit): employees + headcount growth, revenue,
//     total VC funding raised + stage, founded year, industry, HQ.
// Cache-first by DOMAIN (kind 'cv') so a re-view — or the deep pass auto-revealing —
// never re-spends. `reveal=1` runs the paid profile; `refresh=1` forces it fresh.
//
//   GET /api/company-vitals?domain=<d>[&reveal=1][&refresh=1]
//
// Gated by domain_owner (same as the report).

import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { withCategory } from '../lib/db/usage.js';
import { getToolLookup, saveToolLookup } from '../lib/db/tools.js';
import { firmographicsApollo } from '../lib/sales/enrich/firmographics.js';
import { dnsMx } from '../lib/whois/lookup.js';
import { fetchJson } from '../lib/util.js';

export const config = { maxDuration: 30 };
const KIND = 'cv';

const cleanDomain = (d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

// Newest Wayback capture → { date, age_days } (free CDX call; limit=-1 = most recent).
async function waybackNewest(domain) {
  try {
    const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&fl=timestamp&limit=-1`;
    const rows = await fetchJson(url);
    const ts = Array.isArray(rows) && rows.length > 1 ? rows[rows.length - 1][0] : (Array.isArray(rows) && rows[0] && rows[0][0] !== 'timestamp' ? rows[0][0] : null);
    if (!ts || !/^\d{14}$/.test(String(ts))) return null;
    const s = String(ts);
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`;
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return null;
    return { date: iso, age_days: Math.round((Date.now() - t) / 864e5) };
  } catch {
    return null;
  }
}

// Quick homepage read. Robust to bot-walls: a Cloudflare/WAF CHALLENGE (403/503 or a
// "just a moment" body) means there IS a live, protected site — NOT a dead one. And a
// fetch that THROWS (timeout / DNS / refused) is "couldn't check" (active:null), never a
// false "no live site". We only assert active/parked when we actually see the page.
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
async function siteStatus(domain) {
  const headers = { 'user-agent': BROWSER_UA, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9' };
  for (const url of [`https://${domain}/`, `https://www.${domain}/`]) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers });
      const body = (await res.text().catch(() => '')).slice(0, 6000).toLowerCase();
      const parked = /this domain (is|may be) for sale|buy this domain|parked (free|by)|domain for sale|hugedomains|sedoparking|godaddy\.com\/domainsearch/.test(body);
      const challenge = res.status === 403 || res.status === 503 || /just a moment|checking your browser|cf-browser-verification|enable javascript and cookies|attention required/.test(body);
      // A challenge = a real site behind a WAF → active. Otherwise active when we got a
      // page and it isn't a parking lander.
      return { reachable: true, status: res.status, parked: parked && !challenge, active: challenge || (!parked && body.length > 200), protected: challenge };
    } catch {
      // try the www. variant before giving up
    } finally {
      clearTimeout(timer);
    }
  }
  return { reachable: null, status: null, parked: false, active: null }; // couldn't check — not "no site"
}

async function gatherAliveness(domain) {
  const [wayback, mx, site] = await Promise.all([
    waybackNewest(domain),
    dnsMx(domain).catch(() => ({ active: null, records: [] })),
    siteStatus(domain).catch(() => ({ reachable: null, active: null })),
  ]);
  // The direct fetch is flaky behind Cloudflare/WAFs, so when it's inconclusive fall back
  // to the Internet Archive: a RECENT snapshot means the site is live + being crawled.
  if (site.active == null && wayback && wayback.age_days != null && wayback.age_days < 90) {
    site.active = true;
    site.via = 'archive';
  }
  return { wayback, mx, site };
}

// A deterministic, inspectable "pry-ability" read from the vitals.
function pryVerdict({ company, aliveness }) {
  const emp = company && Number(company.employees) || 0;
  const funded = company && Number(company.fundingAmount) > 0;
  const site = (aliveness && aliveness.site) || {};
  const active = site.active === true;
  const deadSite = site.active === false; // explicit negative only (null = couldn't check)
  const mxActive = aliveness && aliveness.mx && aliveness.mx.active === true;
  const fresh = aliveness && aliveness.wayback && aliveness.wayback.age_days != null && aliveness.wayback.age_days < 120;
  if ((emp >= 50 || funded) && (active || mxActive)) return { band: 'very_hard', label: 'Very hard to pry', why: 'Sizable / funded company actively using the domain as its live brand.' };
  if (emp >= 10 || active || mxActive) return { band: 'hard', label: 'Hard to pry', why: 'A real, operating business is using this domain (live site and/or active email).' };
  if (deadSite && !mxActive && !fresh) return { band: 'possible', label: 'Possibly pry-able', why: 'No live site, no active email, and no recent updates — looks dormant.' };
  return { band: 'unclear', label: 'Unclear', why: 'Mixed signals — needs a human read.' };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const user = await currentUser(req);
  if (user && !userCan(user, 'domain_owner')) {
    res.status(403).json({ error: "You don't have access to the Domain Owner module." });
    return;
  }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Use GET' }); return; }

  const domain = cleanDomain(req.query.domain || req.query.q);
  if (!domain) { res.status(400).json({ error: 'Provide a domain (?domain=example.com).' }); return; }
  const reveal = req.query.reveal === '1' || req.query.reveal === 'true';
  const refresh = req.query.refresh === '1' || req.query.refresh === 'true';

  try {
    const cached = refresh ? null : await getToolLookup(KIND, domain).catch(() => null);
    // Always (re)compute the cheap aliveness — it's fast + free and should stay current.
    const aliveness = await gatherAliveness(domain);

    // Company firmographics: served from cache if we have it; run the paid Apollo call
    // only when explicitly revealed (a credit) and not already cached.
    let company = cached && cached.data && cached.data.company ? cached.data.company : null;
    let revealed = !!company;
    if (reveal && (!company || refresh)) {
      try {
        company = await withCategory('domain_owner', () => firmographicsApollo(domain, process.env));
        revealed = true;
      } catch (e) {
        company = null;
        revealed = false;
        // fall through — aliveness still returns; surface a soft note
        res.setHeader('x-vitals-note', String((e && e.message) || e).slice(0, 120));
      }
    }

    const verdict = pryVerdict({ company, aliveness });
    const out = { domain, aliveness, company, revealed, verdict };
    // Persist the profile (with the just-gathered aliveness) so re-views are instant.
    if (company) await saveToolLookup(KIND, domain, out).catch(() => {});
    res.status(200).json({ ...out, cached: !!(cached && cached.data && cached.data.company) && !refresh });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
