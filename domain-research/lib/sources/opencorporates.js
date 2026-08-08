import { fetchJson } from '../util.js';

// OpenCorporates — official company-registry records. When a domain's owner is a
// COMPANY (registrant org, an operating LLC, a redirect target's parent), this maps
// the company name to its registry record: jurisdiction, status, registered address,
// and OFFICERS (named directors/agents) — turning "owned by Acme Holdings LLC" into
// real people + a real address to run through RocketReach/FullEnrich.
// Needs OPENCORPORATES_API_KEY (free developer tier available; paid for volume).
const BASE = 'https://api.opencorporates.com/v0.4';

export default {
  name: 'opencorporates_search',
  description:
    'Search official company registries (OpenCorporates) by company NAME → matching entities with jurisdiction, ' +
    'status, registered address, and (for the top match) OFFICERS/directors. Use when the owner is a company: it ' +
    'converts an org name into named people + an address to enrich. Optionally scope by jurisdiction (e.g. "us_de", "gb").',
  parameters: {
    type: 'object',
    properties: {
      company: { type: 'string', description: 'Company / organization name to search for' },
      jurisdiction: { type: 'string', description: 'Optional jurisdiction code, e.g. us_de, us_ca, gb' },
    },
    required: ['company'],
  },
  requiresKey: ['OPENCORPORATES_API_KEY'],
  async run({ company, jurisdiction }, { env }) {
    const q = String(company || '').trim();
    if (!q) throw new Error('company required');
    const p = new URLSearchParams({ q, api_token: env.OPENCORPORATES_API_KEY, per_page: '10', order: 'score' });
    if (jurisdiction) p.set('jurisdiction_code', String(jurisdiction).trim());
    const data = await fetchJson(`${BASE}/companies/search?${p}`, {}, 15000);
    const list = ((data && data.results && data.results.companies) || []).map((x) => x.company).filter(Boolean);
    const companies = list.slice(0, 6).map((c) => ({
      name: c.name,
      number: c.company_number,
      jurisdiction: c.jurisdiction_code,
      status: c.current_status || (c.inactive ? 'inactive' : 'active'),
      type: c.company_type || undefined,
      incorporated: c.incorporation_date || undefined,
      address: c.registered_address_in_full || undefined,
    }));

    // Fetch OFFICERS for the strongest match only (bounded — 1 extra call).
    if (companies[0] && list[0] && list[0].jurisdiction_code && list[0].company_number) {
      try {
        const det = await fetchJson(
          `${BASE}/companies/${list[0].jurisdiction_code}/${encodeURIComponent(list[0].company_number)}?api_token=${env.OPENCORPORATES_API_KEY}`,
          {}, 12000,
        );
        const officers = (((det && det.results && det.results.company && det.results.company.officers) || []))
          .map((o) => o.officer).filter(Boolean)
          .map((o) => ({ name: o.name, position: o.position || undefined, address: o.address || undefined }))
          .slice(0, 15);
        if (officers.length) companies[0].officers = officers;
      } catch { /* fail-open: keep the search results without officers */ }
    }

    return {
      query: q,
      total: (data && data.results && data.results.total_count) || companies.length,
      companies,
      note: companies.length ? 'Top match includes officers (named people) where the registry exposes them.' : 'No registry match — try a cleaner legal name or a jurisdiction.',
    };
  },
};
