import { fetchJson } from '../util.js';

// Whoxy Reverse WHOIS (premium). Find other domains registered by the same
// owner — search by registrant name, email, or company. A cheaper, working
// alternative to WhoisXML's reverse APIs for discovering an owner's portfolio.
// $10 / 1000 queries.
const BASE = 'https://api.whoxy.com/';

export default {
  name: 'whoxy_reverse',
  description:
    'Whoxy Reverse WHOIS (premium). Find other domains by the same owner OR the same-label cluster across TLDs. ' +
    'Search by registrant email (strongest), company, or name to uncover the owner\'s wider portfolio (corroborates ' +
    'ownership / reveals a non-private sibling); OR by keyword = the SLD (e.g. "bngo") to enumerate the full ' +
    'cross-TLD cluster (bngo.com/.net/.org/.xyz…) for the registration-cluster exercise. Email match is the most ' +
    'precise; name/keyword can be noisier.',
  parameters: {
    type: 'object',
    properties: {
      email: { type: 'string', description: 'Registrant email — most precise match' },
      company: { type: 'string', description: 'Registrant organization/company name' },
      name: { type: 'string', description: 'Registrant person name (can be noisy)' },
      keyword: { type: 'string', description: 'Free-text keyword across WHOIS fields' },
    },
  },
  requiresKey: ['WHOXY_API_KEY'],
  async run({ email, company, name, keyword }, { env }) {
    const p = new URLSearchParams({ key: env.WHOXY_API_KEY, reverse: 'whois' });
    if (email) p.set('email', String(email).trim());
    else if (company) p.set('company', String(company).trim());
    else if (name) p.set('name', String(name).trim());
    else if (keyword) p.set('keyword', String(keyword).trim());
    else throw new Error('Provide one of: email, company, name, keyword');

    const data = await fetchJson(`${BASE}?${p}`);
    if (data && Number(data.status) === 0) throw new Error(`Whoxy reverse: ${data.status_reason || 'error'}`);

    const results = Array.isArray(data && data.search_result) ? data.search_result : [];
    const out = {
      query: email || company || name || keyword,
      total_results: (data && data.total_results) || results.length,
      domains: results.slice(0, 50).map((r) => ({
        domain: r.domain_name,
        created: r.create_date || undefined,
        registrar: (r.domain_registrar && r.domain_registrar.registrar_name) || undefined,
      })),
    };
    if (!results.length && data && typeof data === 'object') out.raw = JSON.stringify(data).slice(0, 1200);
    return out;
  },
};
