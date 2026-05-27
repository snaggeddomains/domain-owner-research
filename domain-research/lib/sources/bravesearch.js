import { fetchJson } from '../util.js';

// Web search via Brave (a SECOND search index, complementary to web_search /
// Serper). Useful for a second opinion when Serper's ranking buried what you
// need — especially to break a brand/handle's anonymity (Quora, NamePros,
// LinkedIn, interviews). Pair with read_url to open the best result.
const ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';

export default {
  name: 'brave_search',
  description:
    'Web search via Brave — a SECOND search index, complementary to web_search (Serper). Use it for a second ' +
    'opinion when web_search did not surface what you need, especially to break a brand/handle anonymity (search ' +
    'Quora, NamePros, LinkedIn, interviews, or a portfolio brand + "owner"/"founder"). Returns top results ' +
    '(title, url, description); follow up with read_url on the best ones.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      count: { type: 'number', description: 'Number of results (1-20, default 12)' },
    },
    required: ['query'],
  },
  requiresKey: ['BRAVE_SEARCH_KEY'],
  async run({ query, count }, { env }) {
    const q = String(query || '').trim();
    if (!q) throw new Error('Provide a search query');
    const n = Math.min(Math.max(parseInt(count, 10) || 12, 1), 20);
    const data = await fetchJson(`${ENDPOINT}?q=${encodeURIComponent(q)}&count=${n}`, {
      headers: { 'X-Subscription-Token': env.BRAVE_SEARCH_KEY, accept: 'application/json' },
    });
    const web = data && data.web && Array.isArray(data.web.results) ? data.web.results : [];
    return {
      query: q,
      results: web.slice(0, 12).map((r) => ({ title: r.title, url: r.url, description: r.description })),
    };
  },
};
