// Inbound-lead enrichment API.
//
//   POST  (x-internal-secret header, NO session — called by Zapier on a new form
//         submission) → upsert the lead, kick the async enrichment, and return the
//         DETERMINISTIC dossier URL so Zapier can drop it into the internal
//         notification. The URL is stable (keyed on the email), so Zapier doesn't
//         wait for enrichment — by review time the dossier has populated itself.
//   GET   ?key=<leadKey>  (session-gated by the `leads` permission) → {lead} for
//         the dossier page to render + poll.
//   GET   ?list=1&q=      → recent leads (gated).
//
// The person deep-dive + Apollo firmographics run past the 60s API cap, so they
// run in the runLead Inngest fn; POST returns immediately.

import { requirePermission } from '../lib/auth.js';
import { isDbConfigured } from '../lib/db/supabase.js';
import { inngest, LEAD_REQUESTED } from '../lib/inngest/client.js';
import { leadKey } from '../lib/leads/key.js';
import { upsertLead, getLeadByKey, listLeads } from '../lib/db/leads.js';
import { emailDomain, isFreeEmail } from '../lib/leads/triage.js';

export const config = { maxDuration: 30 };

const SECRET = process.env.RESEARCH_INTERNAL_SECRET || '';

function leadUrl(key) {
  const base = (process.env.APP_URL || 'https://app.snagged.com/research').replace(/\/+$/, '');
  return `${base}/#/lead/${key}`;
}

// Pull the fields off a Formspark/Zapier POST — tolerant of a few label spellings
// (the form field names vary), so the same endpoint works if the form changes.
function readForm(b) {
  const pick = (...keys) => {
    for (const k of keys) {
      if (b[k] != null && String(b[k]).trim() !== '') return String(b[k]).trim();
    }
    return null;
  };
  return {
    first_name: pick('first_name', 'First Name', 'firstName'),
    last_name: pick('last_name', 'Last Name', 'lastName'),
    name: pick('name', 'Name', 'full_name'),
    email: pick('email', 'Email', 'Email Address', 'email_address'),
    linkedin_url: pick('linkedin_url', 'LinkedIn', 'linkedin'),
    location: pick('location', 'Location'),
    domain_of_interest: pick('domain_of_interest', 'domain', 'Domain Name S Of Interest', 'domains', 'Domains'),
    intent: pick('intent', 'i_want_to', 'I Want To', 'Acquire or Sell'),
    budget: pick('budget', 'Budget'),
    message: pick('message', 'Message'),
    owner_outreach: pick('owner_outreach', 'Owner Outreach', 'Owner Contact'),
  };
}

async function handlePost(req, res) {
  // Machine-to-machine auth — a shared secret header, NOT a session (Zapier has no
  // cookie). If the secret is unset we refuse rather than run open.
  if (!SECRET || req.headers['x-internal-secret'] !== SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const form = readForm(body);
  const email = (form.email || '').toLowerCase();
  if (!email || !/@/.test(email)) {
    res.status(400).json({ error: 'A valid email is required.' });
    return;
  }
  const key = leadKey(email);
  const name = [form.first_name, form.last_name].filter(Boolean).join(' ').trim() || form.name || null;
  const companyDomain = isFreeEmail(email) ? null : emailDomain(email);

  if (isDbConfigured()) {
    await upsertLead({
      lead_key: key, email, name,
      company_domain: companyDomain,
      domain_of_interest: form.domain_of_interest,
      intent: form.intent, budget: form.budget, form,
    });
    // Fire-and-forget the enrichment; the deterministic URL is returned NOW.
    try { await inngest.send({ name: LEAD_REQUESTED, data: { lead_key: key } }); } catch { /* best-effort */ }
  }
  res.status(200).json({ ok: true, key, url: leadUrl(key) });
}

async function handleGet(req, res) {
  const user = await requirePermission(req, res, 'leads');
  if (!user) return;
  if (req.query.list != null) {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    res.status(200).json({ leads: await listLeads({ q, limit }) });
    return;
  }
  const key = String(req.query.key || '').trim();
  if (!key) { res.status(400).json({ error: 'Missing key' }); return; }
  const lead = await getLeadByKey(key);
  if (!lead) { res.status(404).json({ error: 'Lead not found' }); return; }
  res.status(200).json({ lead });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') return await handlePost(req, res);
    if (req.method === 'GET') return await handleGet(req, res);
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
