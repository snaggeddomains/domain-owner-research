import { fetchJson } from '../util.js';

// Web search via Serper.dev (Google results, premium). One primitive covers
// Google + LinkedIn + Crunchbase + social + news, because the agent scopes the
// query per site (site:linkedin.com, site:crunchbase.com, …). Direct scraping
// of those sites is blocked, so search is the reliable way in.
const ENDPOINT = 'https://google.serper.dev/search';

export default {
  name: 'web_search',
  description:
    'Web search (Google via Serper, premium). Search the open web — news, LinkedIn, Crunchbase, X/Twitter, ' +
    'forums, company registries — for a person name, company, distinctive email, or the domain, to surface ' +
    'ownership hints and current affiliation/contact. Optionally scope to one site (e.g. linkedin.com, ' +
    'crunchbase.com). Returns the top results (title, link, snippet) and any knowledge-graph entity.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query, e.g. "Paul Ginsburg" drive.com' },
      site: { type: 'string', description: 'Optional: restrict to one site, e.g. linkedin.com, crunchbase.com, x.com' },
    },
    required: ['query'],
  },
  requiresKey: ['SERPER_API_KEY'],
  async run({ query, site }, { env }) {
    if (!query || !String(query).trim()) throw new Error('Provide a search query in "query"');
    const q = site ? `${String(query).trim()} site:${String(site).trim()}` : String(query).trim();
    const data = await fetchJson(ENDPOINT, {
      method: 'POST',
      headers: { 'X-API-KEY': env.SERPER_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ q, num: 10 }),
    });
    const organic = Array.isArray(data && data.organic) ? data.organic : [];
    return {
      query: q,
      knowledge_graph: data && data.knowledgeGraph ? data.knowledgeGraph : undefined,
      results: organic.slice(0, 10).map((r) => ({ title: r.title, link: r.link, snippet: r.snippet })),
    };
  },
};
