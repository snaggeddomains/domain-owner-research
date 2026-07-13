import { getDb } from './supabase.js';

// Inbound-lead persistence. One row PER lead, keyed by the deterministic `lead_key`
// (HMAC of the email) so a re-submission upserts the same row — the dossier URL is
// stable. The full enriched dossier (person + company + triage) lives in `result`.
const LEADS = 'domain_research_leads';

// Create-or-refresh a lead by its deterministic key. Resets it to `pending` so a
// re-submission re-enriches. Best-effort strip+retry on a missing-column error so
// the app degrades gracefully before the migration runs.
export async function upsertLead({ lead_key, email, name, company_domain, domain_of_interest, intent, budget, form }) {
  const row = {
    lead_key,
    email: email || null,
    name: name || null,
    company_domain: company_domain || null,
    domain_of_interest: domain_of_interest || null,
    intent: intent || null,
    budget: budget || null,
    form: form || null,
    status: 'pending',
    tier: null,
    error: null,
    result: null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await getDb()
    .from(LEADS)
    .upsert(row, { onConflict: 'lead_key' })
    .select('id')
    .single();
  if (error) throw new Error(`upsertLead: ${error.message}`);
  return data.id;
}

export async function getLeadByKey(lead_key) {
  const { data, error } = await getDb().from(LEADS).select('*').eq('lead_key', lead_key).maybeSingle();
  if (error) throw new Error(`getLeadByKey: ${error.message}`);
  return data || null;
}

export async function setLeadStatus(lead_key, status, patch = {}) {
  const update = { status, updated_at: new Date().toISOString(), ...patch };
  if (update.error != null) update.error = String(update.error).slice(0, 2000);
  const { error } = await getDb().from(LEADS).update(update).eq('lead_key', lead_key);
  if (error) throw new Error(`setLeadStatus: ${error.message}`);
}

export async function listLeads({ limit = 50, q = '' } = {}) {
  let query = getDb()
    .from(LEADS)
    .select('id,lead_key,email,name,domain_of_interest,tier,status,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,domain_of_interest.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) throw new Error(`listLeads: ${error.message}`);
  return data || [];
}

export default { upsertLead, getLeadByKey, setLeadStatus, listLeads };
