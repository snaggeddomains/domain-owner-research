import { fetchJson } from '../util.js';

// RocketReach people SEARCH — free (no lookup/export credits per RocketReach
// docs). Returns candidate profiles (no emails/phones). Retrieving contact
// details is a separate paid Lookup, kept behind the "go deeper" gate.
const DEFAULT_URL = 'https://api.rocketreach.co/api/v2/person/search';

export default {
  name: 'rocketreach_search',
  description:
    'RocketReach people search (FREE — search does not spend lookup credits). Given a candidate owner name and/or ' +
    'company surfaced from WHOIS/site/archive evidence, returns matching professional profiles (name, title, ' +
    'employer, LinkedIn, location) to corroborate or identify the owner. Does NOT return emails/phones — that is a ' +
    'separate paid lookup. Provide at least one of name, company, title, or linkedin_url.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Person name, e.g. "John Doe"' },
      company: { type: 'string', description: 'Current employer / company name' },
      title: { type: 'string', description: 'Current job title' },
      linkedin_url: { type: 'string', description: 'A LinkedIn profile URL to match' },
    },
  },
  requiresKey: ['ROCKETREACH_API_KEY'],
  async run({ name, company, title, linkedin_url }, { env }) {
    const query = {};
    if (name) query.name = [name];
    if (company) query.current_employer = [company];
    if (title) query.current_title = [title];
    if (linkedin_url) query.linkedin_url = [linkedin_url];
    if (Object.keys(query).length === 0) {
      throw new Error('Provide at least one of: name, company, title, linkedin_url');
    }

    const url = env.ROCKETREACH_URL_TEMPLATE || DEFAULT_URL;
    return await fetchJson(url, {
      method: 'POST',
      headers: { 'Api-Key': env.ROCKETREACH_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    });
  },
};
