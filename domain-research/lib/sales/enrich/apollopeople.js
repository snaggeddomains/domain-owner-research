// Sales Research — Apollo PEOPLE discovery (by company DOMAIN).
//
// The contact waterfall's high-coverage discovery source. Unlike RocketReach's
// fuzzy current_employer name filter (which over-rejects brand/legal-name variance —
// a "Carrot" employee at "Carrot Insurance"), Apollo is queried BY DOMAIN, so the
// people it returns actually work at that domain. Reuses APOLLO_ENRICH_API_KEY.
//
// Two steps (verified live 2026-08-05):
//  1) mixed_people/api_search  → LIGHTWEIGHT rows: {id, first_name, obfuscated last
//     name, title, organization.name, has_email}. It does NOT return the full name
//     or email — those come from the reveal.
//  2) people/match {id, reveal_personal_emails:true} → full name + VERIFIED email
//     (+ linkedin, sometimes phone). 1 credit each.
// (The older mixed_people/search endpoint is deprecated → HTTP 422.) Fail-open.

const BASE = 'https://api.apollo.io/api/v1';

async function apolloPost(path, key, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${BASE}/${path}`, {
      method: 'POST',
      headers: { 'x-api-key': key, 'content-type': 'application/json', accept: 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

const clean = (d) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
const LOCKED = /email_not_unlocked|not_unlocked|notunlocked/i;
const cleanEmail = (e) => (e && !LOCKED.test(String(e)) && /@/.test(String(e))) ? String(e).trim() : null;
const firstPhone = (arr) => (Array.isArray(arr) ? arr : []).map((x) => (x && (x.raw_number || x.sanitized_number || x.number)) || '').find(Boolean) || null;

// Search people at a domain, targeted by titles. Returns lightweight rows (no full
// name/email yet — reveal each id to get those). `has_email`/`has_phone` flag which
// are worth a reveal credit. Fail-open → [].
export async function apolloPeopleByDomain(domain, titles, env = process.env, { perPage = 10 } = {}) {
  const key = env.APOLLO_ENRICH_API_KEY;
  const d = clean(domain);
  if (!key || !d) return [];
  const body = {
    q_organization_domains_list: [d],
    person_titles: (titles || []).slice(0, 10),
    page: 1,
    per_page: Math.min(perPage, 25),
  };
  const data = await apolloPost('mixed_people/api_search', key, body);
  const people = (data && Array.isArray(data.people)) ? data.people : [];
  return people.filter((p) => p && p.id).map((p) => ({
    id: p.id,
    first_name: p.first_name || '',
    title: p.title || null,
    org_name: (p.organization && p.organization.name) || null,
    org_domain: d,
    has_email: p.has_email === true,
    has_phone: p.has_direct_phone === 'Yes' || p.has_direct_phone === true,
  }));
}

// Reveal a person by Apollo id → full name + verified email (+ linkedin/phone).
// 1 credit. Fail-open → null.
export async function apolloReveal(id, env = process.env) {
  const key = env.APOLLO_ENRICH_API_KEY;
  if (!key || !id) return null;
  const data = await apolloPost('people/match', key, { id, reveal_personal_emails: true });
  const p = data && data.person;
  if (!p) return null;
  const name = p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
  if (!name) return null;
  return {
    name,
    title: p.title || null,
    email: cleanEmail(p.email),
    phone: firstPhone(p.phone_numbers),
    linkedin: p.linkedin_url || null,
    org_domain: (p.organization && (p.organization.primary_domain || p.organization.domain)) || null,
  };
}
