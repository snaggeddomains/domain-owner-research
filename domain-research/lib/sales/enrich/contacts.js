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

function firstProfile(searchResult) {
  const arr = searchResult && (searchResult.profiles || searchResult.data || searchResult.results);
  return Array.isArray(arr) && arr.length ? arr[0] : null;
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
      profile = firstProfile(res);
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
