// Sales Research Agent — contact ENRICH (decision-makers at a selected company).
//
// People discovery = RocketReach (locked vendor). Two steps, mirroring the rest of
// the app: rocketreach_search (FREE — profiles by company+title) → rocketreach_lookup
// (PAID — spends a credit for the email/phone). On-demand, per SELECTED company only.
//
// Role targeting by company size (SALES_RESEARCH_SPEC.md):
//   SMB/mid   → Founder, CEO, CMO, CTO
//   Enterprise→ functional/legal leaders (a premium-domain buy is a legal/brand call)
//
// Best-effort throughout: a RocketReach miss is normal (no record ≠ failure).

import rocketreachSearch from '../../sources/rocketreach.js';
import rocketreachLookup from '../../sources/rocketreachlookup.js';
import fullenrichLookup from '../../sources/fullenrich.js';
import { apolloPeopleByDomain, apolloReveal } from './apollopeople.js';

const SMB_ROLES = ['Founder', 'Co-Founder', 'CEO', 'President', 'Owner', 'CMO', 'CTO', 'Head of Marketing', 'VP Marketing', 'Head of Product'];
const ENTERPRISE_ROLES = ['CMO', 'VP Marketing', 'Head of Brand', 'Head of Digital', 'Chief Digital Officer', 'General Counsel', 'CFO', 'Head of Product', 'VP Product'];

function rolesFor(employeeCount) {
  return (employeeCount && employeeCount >= 250) ? ENTERPRISE_ROLES : SMB_ROLES;
}

function profilesOf(searchResult) {
  const arr = searchResult && (searchResult.profiles || searchResult.data || searchResult.results);
  return Array.isArray(arr) ? arr : [];
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const tokens = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const regDomain = (s) => {
  const h = String(s || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  const parts = h.split('.').filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join('.') : h;
};
// Legal-entity suffixes only — so "Modulate, Inc." matches the company "Modulate"
// but a DIFFERENT company that merely shares the word ("Modulate Technologies")
// does NOT. RocketReach's current_employer filter is fuzzy and returns both, which
// is how a card for one company got a contact from an unrelated same-named company.
const CORP_SUFFIX = new Set(['inc', 'incorporated', 'llc', 'llp', 'corp', 'corporation',
  'co', 'company', 'ltd', 'limited', 'gmbh', 'sa', 'ag', 'plc', 'bv', 'srl', 'pty', 'oy', 'ab', 'as', 'kk']);

function employerMatches(employer, company) {
  const e = tokens(employer); const c = tokens(company);
  if (!e.length || !c.length) return false;
  if (norm(employer) === norm(company)) return true;
  // employer must START with all the company tokens, and any EXTRA tokens may only
  // be legal-entity suffixes (not extra real words like "technologies"/"group").
  if (c.some((t, i) => e[i] !== t)) return false;
  return e.slice(c.length).every((t) => CORP_SUFFIX.has(t));
}

// A RocketReach profile's employer domain, from whichever field carries it.
function employerDomainOf(p) {
  const d = p.current_employer_domain || p.employer_domain || p.current_employer_website
    || p.company_domain || p.company_website || '';
  return d ? regDomain(d) : '';
}

// Pick the profile that actually works at THIS company: a domain match (strongest)
// or an employer-name match (legal-suffix tolerant). Returns null rather than a
// wrong-company person — for outreach a wrong contact is worse than none.
function pickProfile(searchResult, company, domain) {
  const profs = profilesOf(searchResult);
  if (!profs.length) return null;
  const target = domain ? regDomain(domain) : '';
  if (target) {
    const byDomain = profs.find((p) => employerDomainOf(p) === target);
    if (byDomain) return byDomain;
  }
  return profs.find((p) => employerMatches(p.current_employer, company)) || null;
}

// Enrich one company's decision-makers via a VENDOR WATERFALL, so coverage isn't
// gated on any single provider (RocketReach alone missed / over-filtered smaller +
// international companies like Carrot Insurance). Order:
//   1) Apollo people-search BY DOMAIN — domain-authoritative discovery (best
//      coverage, no fuzzy employer-name matching), reveal emails via people/match.
//   2) RocketReach — fills more decision-makers when we're still thin (its strict
//      same-company filter stays, to avoid wrong-company contacts).
//   3) FullEnrich — a name+domain email/phone waterfall to FILL any contact we
//      found but couldn't get an email for.
// Every vendor is wrapped + fail-open; `lookup` gates the paid email/phone steps.
export async function enrichCompany(candidate, { env = process.env, lookup = true, maxRoles = 4, maxContacts = 6 } = {}) {
  const company = candidate.company;
  const domain = candidate.domain;
  if (!company && !domain) return [];
  const allRoles = rolesFor(candidate.employee_count);   // full title set → Apollo (it title-filters)
  const roles = allRoles.slice(0, maxRoles);             // lean set → RocketReach (one search per title)
  const t0 = Date.now();                                 // time budget — FullEnrich polls up to 40s
  const byName = new Map();                              // normalized name → contact (deduped across vendors)
  const add = (name, title, linkedin, source) => {
    const key = norm(name);
    if (!name || !key) return null;
    let c = byName.get(key);
    if (!c) { c = { name, title: title || null, email: null, phone: null, linkedin: linkedin || null, sources: [source] }; byName.set(key, c); }
    else { if (!c.title && title) c.title = title; if (!c.linkedin && linkedin) c.linkedin = linkedin; if (!c.sources.includes(source)) c.sources.push(source); }
    return c;
  };

  // 1) APOLLO — discover people at the DOMAIN (api_search), then REVEAL each for the
  // full name + verified email (search returns only id/first-name/title/has_email).
  if (lookup && domain && env.APOLLO_ENRICH_API_KEY) {
    try {
      const people = await apolloPeopleByDomain(domain, allRoles, env, { perPage: 10 });
      // The title filter can shrink coverage at a SMALL company — if we're thin on
      // reachable people, add a title-less pass (Apollo ranks senior people first).
      if (people.filter((p) => p.has_email).length < 2) {
        const seen = new Set(people.map((p) => p.id));
        for (const p of await apolloPeopleByDomain(domain, [], env, { perPage: 10 })) if (!seen.has(p.id)) people.push(p);
      }
      people.sort((a, b) => (Number(b.has_email) - Number(a.has_email)));   // reveal the reachable ones first
      let revealed = 0;
      for (const p of people) {
        if (revealed >= maxContacts) break;
        if (!p.has_email && !p.has_phone) continue;                          // nothing to unlock → skip the credit
        let r = null;
        try { r = await apolloReveal(p.id, env); } catch { r = null; }
        revealed++;
        if (r && r.name) {
          const c = add(r.name, r.title || p.title, r.linkedin, 'apollo');
          if (c) { if (r.email && !c.email) c.email = r.email; if (r.phone && !c.phone) c.phone = r.phone; }
        }
      }
    } catch { /* apollo down — fall through to RocketReach */ }
  }

  // 2) ROCKETREACH — add more decision-makers if we're still thin.
  if (company && env.ROCKETREACH_API_KEY && byName.size < maxContacts) {
    for (const title of roles) {
      let profile;
      try { const res = await rocketreachSearch.run({ company, title }, { env }); profile = pickProfile(res, company, domain); }
      catch { profile = null; }
      if (!profile || !profile.name) continue;
      const c = add(profile.name, profile.current_title || title, profile.linkedin_url, 'rocketreach');
      if (c && lookup && !c.email) {
        try {
          const det = await rocketreachLookup.run({ id: profile.id, linkedin_url: profile.linkedin_url, name: profile.name, company }, { env });
          if (det && det.found) { if ((det.emails || [])[0]) c.email = det.emails[0]; if ((det.phones || [])[0] && !c.phone) c.phone = det.phones[0]; }
        } catch { /* lookup miss */ }
      }
    }
  }

  // 3) FULLENRICH — fill an email for the top person we found but couldn't reach.
  // Capped to ONE lookup (it polls up to 40s) and only with time budget left, so a
  // single company enrich stays under the 60s API cap.
  if (lookup && (domain || company) && env.FULL_ENRICH_API_KEY && (Date.now() - t0) < 15000) {
    for (const c of byName.values()) {
      if (c.email) continue;
      const parts = c.name.split(/\s+/); const fn = parts[0]; const ln = parts.slice(1).join(' ');
      if (!fn || !ln) continue;
      try {
        const r = await fullenrichLookup.run({ first_name: fn, last_name: ln, domain, company, include_phone: true }, { env });
        if (r && r.found) {
          if (!c.email) c.email = (r.emails || [])[0] || r.work_email || r.personal_email || null;
          if (!c.phone) c.phone = (r.phones || [])[0] || r.phone || null;
          if (c.email || c.phone) c.sources.push('fullenrich');
        }
      } catch { /* fill miss */ }
      break;   // one FullEnrich fill per company (the 40s poll dominates the budget)
    }
  }

  // Emit — contacts with a reachable email/phone first; strip internals.
  const out = [...byName.values()].map((c) => ({ name: c.name, title: c.title, email: c.email, phone: c.phone, linkedin: c.linkedin, source: c.sources.join('+') }));
  out.sort((a, b) => (Boolean(b.email || b.phone) - Boolean(a.email || a.phone)));
  return out.slice(0, maxContacts);
}
