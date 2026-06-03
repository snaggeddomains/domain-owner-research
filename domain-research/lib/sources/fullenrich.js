import { fetchJson } from '../util.js';

// FullEnrich WATERFALL contact lookup (premium — spends a credit). Unlike a
// single-provider lookup, FullEnrich runs 15+ data vendors in sequence and
// returns the best WORK + PERSONAL emails (with deliverability status) and
// PHONE for a named person. Async: POST starts a batch (returns enrichment_id),
// then we poll the GET endpoint until status FINISHED. Same anchor signals as
// RocketReach (name + company/domain/linkedin); the domain under research is a
// strong anchor we almost always have.
const BASE = 'https://app.fullenrich.com/api/v2/contact/enrich/bulk';
const POLL_MS = 4000;
const MAX_POLLS = 24; // ~96s — a multi-provider waterfall can take a bit to settle

function collectEmails(ci) {
  const out = [];
  const push = (o) => { if (o && o.email) out.push({ email: o.email, status: o.status || null }); };
  push(ci.most_probable_work_email);
  push(ci.most_probable_personal_email);
  for (const e of (ci.work_emails || [])) push(e);
  for (const e of (ci.personal_emails || [])) push(e);
  const seen = new Set();
  return out.filter((e) => { const k = e.email.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

function collectPhones(ci) {
  const out = [];
  if (ci.most_probable_phone && ci.most_probable_phone.number) out.push(ci.most_probable_phone.number);
  for (const p of (ci.phones || [])) { const n = typeof p === 'string' ? p : (p && p.number); if (n) out.push(n); }
  return [...new Set(out)];
}

export default {
  name: 'fullenrich_lookup',
  description:
    'FullEnrich WATERFALL contact lookup (PREMIUM — spends a credit). Runs many data providers in sequence to find ' +
    'the best WORK + PERSONAL emails (each with a deliverability status) and PHONE for a NAMED person — higher match ' +
    'rate than any single provider. Use it for the PRIMARY likely owner once named: pass their name plus the domain ' +
    'under research and/or their company/LinkedIn URL. Try it when rocketreach_lookup misses, or to corroborate a hit. ' +
    'A miss just means no provider had a record — not that contact info does not exist. NEVER run it on brokers, ' +
    'marketplaces, or registrar/privacy entities.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Full name, e.g. "Jane Doe" (or pass first_name + last_name)' },
      first_name: { type: 'string', description: 'First name' },
      last_name: { type: 'string', description: 'Last name' },
      domain: { type: 'string', description: 'Domain associated with the person (e.g. the domain under research) — strongly improves the match' },
      company: { type: 'string', description: 'Company / employer name to disambiguate' },
      linkedin_url: { type: 'string', description: 'LinkedIn profile URL — the single strongest anchor when known' },
    },
  },
  requiresKey: ['FULL_ENRICH_API_KEY'],
  async run({ name, first_name, last_name, domain, company, linkedin_url }, { env }) {
    let fn = first_name, ln = last_name;
    if ((!fn || !ln) && name) {
      const parts = String(name).trim().split(/\s+/);
      fn = fn || parts[0];
      ln = ln || parts.slice(1).join(' ');
    }
    if (!fn || !ln) throw new Error('Provide first_name + last_name (or a full name).');
    if (!domain && !company && !linkedin_url) {
      throw new Error('Provide at least one anchor: domain, company, or linkedin_url.');
    }

    const headers = { Authorization: `Bearer ${env.FULL_ENRICH_API_KEY}`, 'content-type': 'application/json' };
    const contact = {
      first_name: fn,
      last_name: ln,
      enrich_fields: ['contact.work_emails', 'contact.personal_emails', 'contact.phones'],
    };
    if (domain) contact.domain = domain;
    if (company) contact.company_name = company;
    if (linkedin_url) contact.linkedin_url = linkedin_url;

    const start = await fetchJson(BASE, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: `domain-research ${domain || company || ''}`.trim(), data: [contact] }),
    });
    const id = start && start.enrichment_id;
    if (!id) {
      return { found: false, status: 'no_id', emails: [], phones: [], raw: JSON.stringify(start).slice(0, 800) };
    }

    let result = null;
    let status = 'IN_PROGRESS';
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      let g;
      try {
        g = await fetchJson(`${BASE}/${encodeURIComponent(id)}`, { headers });
      } catch {
        continue; // transient — keep polling
      }
      status = String((g && g.status) || '').toUpperCase();
      if (status === 'FINISHED') { result = g; break; }
      if (['CANCELED', 'CREDITS_INSUFFICIENT', 'RATE_LIMIT', 'UNKNOWN'].includes(status)) {
        return { found: false, status, enrichment_id: id, emails: [], phones: [], note: `FullEnrich returned ${status}.` };
      }
    }
    if (!result) {
      return { found: false, status: status || 'in_progress', enrichment_id: id, emails: [], phones: [], note: 'Still running; re-check later with the enrichment_id.' };
    }

    const row = (result.data && result.data[0]) || {};
    const ci = row.contact_info || {};
    const emails = collectEmails(ci);
    const phones = collectPhones(ci);
    const out = {
      found: emails.length > 0 || phones.length > 0,
      status: 'FINISHED',
      name: `${fn} ${ln}`.trim(),
      work_email: (ci.most_probable_work_email && ci.most_probable_work_email.email) || null,
      personal_email: (ci.most_probable_personal_email && ci.most_probable_personal_email.email) || null,
      phone: (ci.most_probable_phone && ci.most_probable_phone.number) || null,
      emails,
      phones,
    };
    if (!emails.length && !phones.length) out.raw = JSON.stringify(result).slice(0, 1500);
    return out;
  },
};
