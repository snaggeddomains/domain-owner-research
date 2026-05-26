import { fetchJson } from '../util.js';

const ENDPOINT = 'https://reverse-ns.whoisxmlapi.com/api/v1';

// Premium (paid) — domains sharing a nameserver, i.e. likely co-owned infra.
export default {
  name: 'reverse_ns',
  description:
    'WhoisXML Reverse NS (premium). Given a nameserver host (e.g. ns37.worldnic.com), returns other domains that ' +
    'use it — surfacing co-owned/portfolio domains that share infrastructure. Strong for corroborating that a ' +
    'historically-named owner still controls a domain whose nameservers never changed.',
  parameters: {
    type: 'object',
    properties: { nameserver: { type: 'string', description: 'Nameserver host, e.g. ns37.worldnic.com' } },
    required: ['nameserver'],
  },
  requiresKey: ['WHOISXML_API_KEY'],
  async run({ nameserver }, { env }) {
    const ns = String(nameserver || '').trim().toLowerCase();
    if (!ns) throw new Error('Provide a nameserver host in "nameserver"');
    const url = `${ENDPOINT}?apiKey=${encodeURIComponent(env.WHOISXML_API_KEY)}&ns=${encodeURIComponent(ns)}`;
    const data = await fetchJson(url);
    const result = Array.isArray(data && data.result) ? data.result : [];
    return {
      nameserver: ns,
      count: typeof data.size === 'number' ? data.size : result.length,
      domains: result.slice(0, 100).map((r) => (typeof r === 'string' ? r : r.name || r)),
    };
  },
};
