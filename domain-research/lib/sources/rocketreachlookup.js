import { fetchJson } from '../util.js';

// RocketReach person LOOKUP (premium — spends a lookup credit). Unlike
// rocketreach_search (profiles only), this returns the person's EMAILS and
// PHONE numbers. Lookups can resolve asynchronously, so we poll checkStatus a
// few times and refetch when it completes. Same ROCKETREACH_API_KEY as search;
// the paid account is what enables lookup credits.
const BASE = 'https://api.rocketreach.co/api/v2';

const norm = (arr, key) =>
  Array.isArray(arr)
    ? arr.map((x) => (typeof x === 'string' ? x : (x && (x[key] || x.email || x.number)) || '')).filter(Boolean)
    : [];

export default {
  name: 'rocketreach_lookup',
  description:
    'RocketReach person LOOKUP (premium — spends a lookup credit). Given a candidate owner (name + company, a ' +
    'LinkedIn URL, or a profile id from rocketreach_search), returns their EMAILS and PHONE numbers plus current ' +
    'title/employer/location. Use this to get direct contact details for the PRIMARY likely owner once named. ' +
    'A miss (no profile / no emails) just means RocketReach has no record — not that contact info does not exist.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Person full name, e.g. "Jane Doe"' },
      company: { type: 'string', description: 'Current employer/company to disambiguate the match' },
      linkedin_url: { type: 'string', description: 'A LinkedIn profile URL to look up directly' },
      id: { type: 'string', description: 'RocketReach profile id returned by rocketreach_search' },
    },
  },
  requiresKey: ['ROCKETREACH_API_KEY'],
  async run({ name, company, linkedin_url, id }, { env }) {
    const headers = { 'Api-Key': env.ROCKETREACH_API_KEY, accept: 'application/json' };
    const q = new URLSearchParams();
    if (id != null && String(id) !== '') q.set('id', String(id));
    else if (linkedin_url) q.set('linkedin_url', String(linkedin_url));
    else {
      if (name) q.set('name', String(name));
      if (company) q.set('current_employer', String(company));
    }
    if (![...q.keys()].length) throw new Error('Provide name (+company), linkedin_url, or id');

    let data;
    try {
      data = await fetchJson(`${BASE}/person/lookup?${q}`, { headers });
    } catch (err) {
      // A 404 "could not find the person" is a normal miss, not a failure.
      if (/\b404\b|could not find|not found/i.test(String(err?.message || err))) {
        return { found: false, status: 'not_found', emails: [], phones: [], note: 'RocketReach has no record for this person.' };
      }
      throw err;
    }
    let status = String((data && data.status) || '').toLowerCase();
    const pid = data && (data.id || (data.profile && data.profile.id));

    // Async lookups come back "searching"/"progress"; poll, then refetch by id.
    for (let i = 0; i < 4 && pid && /search|progress|wait|queue/.test(status); i++) {
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const st = await fetchJson(`${BASE}/person/checkStatus?ids=${encodeURIComponent(pid)}`, { headers });
        const s = Array.isArray(st) ? st[0] : (st && st.items && st.items[0]) || st;
        status = String((s && s.status) || status).toLowerCase();
        if (/complete|done|success/.test(status)) {
          data = await fetchJson(`${BASE}/person/lookup?id=${encodeURIComponent(pid)}`, { headers });
          break;
        }
      } catch {
        break;
      }
    }

    const p = (data && data.profile) || data || {};
    const emails = norm(p.emails, 'email');
    const phones = norm(p.phones, 'number');
    const out = {
      found: emails.length > 0 || phones.length > 0,
      status: (data && data.status) || status || 'unknown',
      name: p.name,
      current_title: p.current_title,
      current_employer: p.current_employer,
      linkedin_url: p.linkedin_url,
      location: p.location,
      emails,
      phones,
    };
    // Surface a raw sample when nothing parsed, so we can adjust to the real shape.
    if (!emails.length && !phones.length) out.raw = JSON.stringify(data).slice(0, 1500);
    return out;
  },
};
