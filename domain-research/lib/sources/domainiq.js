import { fetchJson } from '../util.js';

// Verified default endpoint (domain_history) — works with just DOMAINIQ_API_KEY.
// Override with DOMAINIQ_URL_TEMPLATE (using {domain} and {key}) for a different
// service/params. The domain is URL-encoded before substitution.
const DEFAULT_TEMPLATE =
  'https://www.domainiq.com/api?key={key}&service=domain_history&domain={domain}&output_mode=json';

export default {
  name: 'domainiq_lookup',
  description:
    'DomainIQ lookup (premium). Historical WHOIS / registrant timeline, reverse-WHOIS (other domains by the same ' +
    'registrant) and related-domain intelligence. Strong for tracking ownership changes and discovering a ' +
    "registrant's wider portfolio.",
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  requiresKey: ['DOMAINIQ_API_KEY'],
  async run({ domain }, { env }) {
    const template = env.DOMAINIQ_URL_TEMPLATE || DEFAULT_TEMPLATE;
    const url = template
      .replaceAll('{domain}', encodeURIComponent(domain))
      .replaceAll('{key}', encodeURIComponent(env.DOMAINIQ_API_KEY));
    return await fetchJson(url);
  },
};
