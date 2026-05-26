import { fetchJson } from '../util.js';

const ENDPOINT = 'https://reverse-whois.whoisxmlapi.com/api/v2';

// Premium (paid) — find the wider portfolio behind a registrant.
export default {
  name: 'reverse_whois',
  description:
    'WhoisXML Reverse WHOIS (premium). Given a registrant NAME, EMAIL or ORGANIZATION, returns other domains ' +
    "registered by that entity — i.e. the owner's wider portfolio. Feed it a name/email surfaced from WHOIS " +
    'history (e.g. a pre-privacy registrant) to find what else they control. search_type "current" or "historic".',
  parameters: {
    type: 'object',
    properties: {
      term: { type: 'string', description: 'Registrant name, email, or organization to search for' },
      search_type: { type: 'string', enum: ['current', 'historic'], description: 'Default current' },
    },
    required: ['term'],
  },
  requiresKey: ['WHOISXML_API_KEY'],
  async run({ term, search_type }, { env }) {
    if (!term || !String(term).trim()) throw new Error('Provide a name, email, or organization in "term"');
    const data = await fetchJson(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        apiKey: env.WHOISXML_API_KEY,
        searchType: search_type === 'historic' ? 'historic' : 'current',
        mode: 'purchase',
        basicSearchTerms: { include: [String(term).trim()] },
      }),
    });
    const list = Array.isArray(data && data.domainsList) ? data.domainsList : [];
    return {
      term: String(term).trim(),
      count: typeof data.domainsCount === 'number' ? data.domainsCount : list.length,
      domains: list.slice(0, 100).map((d) => (typeof d === 'string' ? d : d.domainName || d.name || d)),
    };
  },
};
