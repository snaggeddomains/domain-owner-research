import { fetchJson } from '../util.js';

// Verified default endpoint (historical WHOIS) — works with just
// BIGDOMAINDATA_API_KEY. Override with BIGDOMAINDATA_URL_TEMPLATE (using
// {domain} and {key}) to hit a different database/params (current, fuzzy, etc.).
const DEFAULT_TEMPLATE =
  'https://api.bigdomaindata.com/?key={key}&database=historical&domain_name={domain}&page_size=100';

export default {
  name: 'bigdomaindata_lookup',
  description:
    'Big Domain Data lookup (premium). Bulk/historical WHOIS and domain ownership records. Useful as a second ' +
    'opinion on registrant history and for filling gaps when RDAP/WhoisXML are redacted.',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  requiresKey: ['BIGDOMAINDATA_API_KEY'],
  async run({ domain }, { env }) {
    const template = env.BIGDOMAINDATA_URL_TEMPLATE || DEFAULT_TEMPLATE;
    const url = template
      .replaceAll('{domain}', encodeURIComponent(domain))
      .replaceAll('{key}', encodeURIComponent(env.BIGDOMAINDATA_API_KEY));
    return await fetchJson(url);
  },
};
