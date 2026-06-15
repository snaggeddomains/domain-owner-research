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

const SMB_ROLES = ['Founder', 'CEO', 'CMO', 'CTO'];
const ENTERPRISE_ROLES = ['General Counsel', 'CFO', 'VP Marketing', 'Head of Brand'];

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

// Enrich one company → up to one decision-maker per targeted role (deduped by name).
// `lookup` gates the paid email/phone step (default on — caller already chose to spend).
export async function enrichCompany(candidate, { env = process.env, lookup = true, maxRoles = 4 } = {}) {
  const company = candidate.company;
  if (!company || !env.ROCKETREACH_API_KEY) return [];
  const roles = rolesFor(candidate.employee_count).slice(0, maxRoles);
  const contacts = [];
  const seen = new Set();

  for (const title of roles) {
    let profile;
    try {
      const res = await rocketreachSearch.run({ company, title }, { env });
      profile = pickProfile(res, company, candidate.domain);
    } catch { profile = null; }
    if (!profile || !profile.name) continue;
    const key = profile.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const contact = {
      name: profile.name,
      title: profile.current_title || title,
      linkedin: profile.linkedin_url || null,
      email: null,
      phone: null,
      source: 'rocketreach',
    };
    if (lookup) {
      try {
        const det = await rocketreachLookup.run(
          { id: profile.id, linkedin_url: profile.linkedin_url, name: profile.name, company },
          { env },
        );
        if (det && det.found) {
          contact.email = (det.emails || [])[0] || null;
          contact.phone = (det.phones || [])[0] || null;
        }
      } catch { /* lookup miss — keep the profile without contact details */ }
    }
    contacts.push(contact);
  }
  return contacts;
}
