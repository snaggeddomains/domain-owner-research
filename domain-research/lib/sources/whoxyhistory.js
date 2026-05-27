import { fetchJson, normalizeDomain, isValidDomain } from '../util.js';

// Whoxy WHOIS History (premium). Returns every captured historical WHOIS record
// for a domain — registrant name/org/email/phone + dates over time — from a
// 692M-domain database. Strong for reconstructing the ownership timeline and
// surfacing pre-privacy named owners. $5 / 1000 queries.
const BASE = 'https://api.whoxy.com/';

const contact = (c) =>
  c
    ? {
        name: c.full_name || undefined,
        company: c.company_name || undefined,
        email: c.email_address || undefined,
        phone: c.phone_number || undefined,
        country: c.country_name || undefined,
      }
    : undefined;

export default {
  name: 'whoxy_history',
  description:
    'Whoxy WHOIS History (premium). Returns the full set of historical WHOIS records for a domain — every captured ' +
    'registrant name, organization, email, phone and the registrar / dates over time. Strong for reconstructing the ' +
    'ownership timeline and surfacing a pre-privacy named owner even when the current record is redacted.',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  requiresKey: ['WHOXY_API_KEY'],
  async run({ domain }, { env }) {
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);
    const data = await fetchJson(`${BASE}?key=${encodeURIComponent(env.WHOXY_API_KEY)}&history=${encodeURIComponent(d)}`);
    if (data && Number(data.status) === 0) throw new Error(`Whoxy history: ${data.status_reason || 'error'}`);

    const records = Array.isArray(data && data.whois_records) ? data.whois_records : [];
    const history = records.map((r) => ({
      created: r.create_date || undefined,
      updated: r.update_date || undefined,
      expires: r.expiry_date || undefined,
      registrar: (r.domain_registrar && r.domain_registrar.registrar_name) || r.registrar_name || undefined,
      registrant: contact(r.registrant_contact),
      admin: contact(r.administrative_contact),
      nameservers: Array.isArray(r.name_servers) ? r.name_servers : undefined,
    }));
    const out = { domain: d, total_records: (data && data.total_records_found) || history.length, history };
    if (!history.length && data && typeof data === 'object') out.raw = JSON.stringify(data).slice(0, 1500);
    return out;
  },
};
