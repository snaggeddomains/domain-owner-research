import { fetchJson } from '../util.js';

// Hunter.io domain-search — the company email pattern + known verified addresses for
// a domain. Complements RocketReach/FullEnrich (often better on smaller/international
// companies) and gives the pattern (e.g. {first}.{last}@) so you can construct a
// likely address for a named owner we can't otherwise reach.
// Needs HUNTER_API_KEY (free tier ~25 searches/mo — so this is a deep-pass action).
const BASE = 'https://api.hunter.io/v2';

export default {
  name: 'hunter_search',
  description:
    "Hunter.io domain search: the company's email PATTERN (e.g. {first}.{last}@domain) plus known, confidence-scored " +
    'email addresses with names/positions for a domain. Use to find or CONSTRUCT a reachable email for a named owner ' +
    'at a company domain, especially when RocketReach/FullEnrich came up empty. Provide the company domain.',
  parameters: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Company domain, e.g. example.com' },
      company: { type: 'string', description: 'Optional company name (used when domain is unknown)' },
    },
  },
  requiresKey: ['HUNTER_API_KEY'],
  async run({ domain, company }, { env }) {
    const p = new URLSearchParams({ api_key: env.HUNTER_API_KEY, limit: '20' });
    if (domain) p.set('domain', String(domain).trim().toLowerCase());
    else if (company) p.set('company', String(company).trim());
    else throw new Error('Provide domain or company');
    const data = await fetchJson(`${BASE}/domain-search?${p}`, {}, 15000);
    const d = (data && data.data) || {};
    const emails = (d.emails || []).map((e) => ({
      email: e.value,
      name: [e.first_name, e.last_name].filter(Boolean).join(' ') || undefined,
      position: e.position || undefined,
      type: e.type || undefined, // personal | generic
      confidence: e.confidence,
      linkedin: e.linkedin || undefined,
    })).slice(0, 20);
    return {
      domain: d.domain || (domain || '').toLowerCase(),
      organization: d.organization || undefined,
      pattern: d.pattern || undefined,
      emails,
      note: emails.length ? 'Personal-type emails are individuals; the pattern lets you construct an address for a named owner.' : 'No emails indexed; the pattern (if any) still lets you construct a likely address.',
    };
  },
};
