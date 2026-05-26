import { fetchJson } from '../util.js';

const ENDPOINT = 'https://reverse-ip.whoisxmlapi.com/api/v1';

// Premium (paid) — domains hosted on a given IP.
export default {
  name: 'reverse_ip',
  description:
    'WhoisXML Reverse IP (premium). Given an IPv4/IPv6 address, returns domains hosted on it — useful to find ' +
    'sibling domains sharing the same server as the target.',
  parameters: {
    type: 'object',
    properties: { ip: { type: 'string', description: 'IP address, e.g. 205.178.190.19' } },
    required: ['ip'],
  },
  requiresKey: ['WHOISXML_API_KEY'],
  async run({ ip }, { env }) {
    const addr = String(ip || '').trim();
    if (!addr) throw new Error('Provide an IP address in "ip"');
    const url = `${ENDPOINT}?apiKey=${encodeURIComponent(env.WHOISXML_API_KEY)}&ip=${encodeURIComponent(addr)}`;
    const data = await fetchJson(url);
    const result = Array.isArray(data && data.result) ? data.result : [];
    return {
      ip: addr,
      count: typeof data.size === 'number' ? data.size : result.length,
      domains: result.slice(0, 100).map((r) => (typeof r === 'string' ? r : r.name || r)),
    };
  },
};
