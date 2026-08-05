// Sales Research — Apollo PEOPLE discovery (by company DOMAIN).
//
// The contact waterfall's high-coverage discovery source. Unlike RocketReach's
// fuzzy current_employer name filter (which over-rejects brand/legal-name variance —
// a "Carrot" employee at "Carrot Insurance"), Apollo is queried BY DOMAIN, so the
// people it returns are domain-authoritative (they actually work at that domain).
// Reuses APOLLO_ENRICH_API_KEY (already set for firmographics). Fully fail-open.
//
// Live-verify on first real key: the people-search + match request/response shapes
// are best-effort (couldn't exercise Apollo from the sandbox).

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

const LOCKED = /email_not_unlocked|not_unlocked|notunlocked/i;
const cleanEmail = (e) => (e && !LOCKED.test(String(e)) && /@/.test(String(e))) ? String(e).trim() : null;
const firstPhone = (p) => {
  const arr = Array.isArray(p) ? p : [];
  const n = arr.map((x) => (x && (x.raw_number || x.sanitized_number || x.number)) || '').find(Boolean);
  return n || null;
};

// Search people at a domain, targeted by titles. Returns normalized people (no
// reveal yet — email may be locked). Fail-open → [].
export async function apolloPeopleByDomain(domain, titles, env = process.env, { perPage = 6 } = {}) {
  const key = env.APOLLO_ENRICH_API_KEY;
  const d = String(domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  if (!key || !d) return [];
  const body = {
    q_organization_domains_list: [d],
    q_organization_domains: d,                          // older param name, harmless if ignored
    person_titles: (titles || []).slice(0, 8),
    page: 1,
    per_page: Math.min(perPage, 10),
  };
  const data = await apolloPost('mixed_people/search', key, body);
  const people = (data && (Array.isArray(data.people) ? data.people : data.contacts)) || [];
  return people.map((p) => ({
    id: p.id || null,
    first_name: p.first_name || (p.name || '').split(/\s+/)[0] || '',
    last_name: p.last_name || (p.name || '').split(/\s+/).slice(1).join(' ') || '',
    name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    title: p.title || null,
    linkedin: p.linkedin_url || null,
    email: cleanEmail(p.email),
    phone: firstPhone(p.phone_numbers),
    org_domain: (p.organization && (p.organization.primary_domain || p.organization.domain)) || d,
  })).filter((p) => p.name);
}

// Reveal a person's email (+ any phone) via people/match. 1 credit. Fail-open → null.
export async function apolloRevealEmail(person, env = process.env) {
  const key = env.APOLLO_ENRICH_API_KEY;
  if (!key || (!person.id && !(person.first_name && person.last_name))) return null;
  const body = person.id
    ? { id: person.id, reveal_personal_emails: true }
    : { first_name: person.first_name, last_name: person.last_name, domain: person.org_domain, reveal_personal_emails: true };
  const data = await apolloPost('people/match', key, body);
  const m = data && data.person;
  if (!m) return null;
  return { email: cleanEmail(m.email), phone: firstPhone(m.phone_numbers) };
}
