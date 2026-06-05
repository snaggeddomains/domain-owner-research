import { getDb } from './supabase.js';

// Sales Research Agent persistence (see SALES_RESEARCH_SPEC.md). Three tables:
// projects (one seed domain we're selling) → candidates (buyer companies) →
// contacts (decision-makers, enriched on demand).
const PROJECTS = 'domain_research_sales_projects';
const CANDIDATES = 'domain_research_sales_candidates';
const CONTACTS = 'domain_research_sales_contacts';

export async function createSalesProject({ seed_domain, seed_sld, filters = null, created_by = null }) {
  const row = { seed_domain, seed_sld, status: 'pending' };
  if (filters) row.filters = filters;
  if (created_by) row.created_by = created_by;
  const { data, error } = await getDb().from(PROJECTS).insert(row).select('id').single();
  if (error) throw new Error(`createSalesProject: ${error.message}`);
  return data.id;
}

export async function getSalesProject(id) {
  const { data, error } = await getDb().from(PROJECTS).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getSalesProject: ${error.message}`);
  return data || null;
}

export async function listSalesProjects({ limit = 50, q = '' } = {}) {
  let query = getDb()
    .from(PROJECTS)
    .select('id,seed_domain,status,stage,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (q) query = query.ilike('seed_domain', `%${q}%`);
  const { data, error } = await query;
  if (error) throw new Error(`listSalesProjects: ${error.message}`);
  return data || [];
}

export async function setSalesProjectStatus(id, status, stage = null, error = null) {
  const patch = { status };
  if (stage !== null) patch.stage = stage;
  if (error !== null) patch.error = String(error).slice(0, 2000);
  const { error: err } = await getDb().from(PROJECTS).update(patch).eq('id', id);
  if (err) throw new Error(`setSalesProjectStatus: ${err.message}`);
}

// Bulk-insert resolved candidates for a project.
export async function insertSalesCandidates(projectId, candidates) {
  if (!candidates.length) return [];
  const rows = candidates.map((c) => ({
    project_id: projectId,
    domain: c.domain || null,
    company: c.company || null,
    company_url: c.company_url || null,
    description: c.description || null,
    employee_count: c.employee_count ?? null,
    location: c.location || null,
    funding: c.funding || null,
    category: c.category || 'upgrade',
    subtype: c.subtype || null,
    angle: c.angle || null,
    status: c.status || null,
    tier: c.qualification?.tier || null,
    match_reason: (c.qualification?.reasons || []).join(' · ') || null,
    firmographics: c.firmographics || null,
    score: c.score ?? null,
    alt_domains: c.alt_domains && c.alt_domains.length ? c.alt_domains : null,
  }));
  const { data, error } = await getDb().from(CANDIDATES).insert(rows).select('id');
  if (error) throw new Error(`insertSalesCandidates: ${error.message}`);
  return data || [];
}

export async function listSalesCandidates(projectId) {
  const { data, error } = await getDb()
    .from(CANDIDATES)
    .select('*')
    .eq('project_id', projectId)
    .order('score', { ascending: false, nullsFirst: false })
    .order('employee_count', { ascending: false, nullsFirst: false });
  if (error) throw new Error(`listSalesCandidates: ${error.message}`);
  return data || [];
}

export async function getSalesCandidate(id) {
  const { data, error } = await getDb().from(CANDIDATES).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getSalesCandidate: ${error.message}`);
  return data || null;
}

// Toggle which candidates the salesperson selected for contact enrichment.
export async function setSalesSelection(projectId, ids, selected) {
  const { error } = await getDb()
    .from(CANDIDATES)
    .update({ selected: Boolean(selected) })
    .eq('project_id', projectId)
    .in('id', ids);
  if (error) throw new Error(`setSalesSelection: ${error.message}`);
}

export async function setCandidateEnrichStatus(id, enrich_status) {
  const { error } = await getDb().from(CANDIDATES).update({ enrich_status }).eq('id', id);
  if (error) throw new Error(`setCandidateEnrichStatus: ${error.message}`);
}

export async function replaceCandidateContacts(candidateId, contacts) {
  const db = getDb();
  await db.from(CONTACTS).delete().eq('candidate_id', candidateId);
  if (!contacts.length) return;
  const rows = contacts.map((c) => ({
    candidate_id: candidateId,
    name: c.name || null,
    title: c.title || null,
    email: c.email || null,
    phone: c.phone || null,
    linkedin: c.linkedin || null,
    source: c.source || null,
  }));
  const { error } = await db.from(CONTACTS).insert(rows);
  if (error) throw new Error(`replaceCandidateContacts: ${error.message}`);
}

export async function listContactsForCandidates(candidateIds) {
  if (!candidateIds.length) return [];
  const { data, error } = await getDb()
    .from(CONTACTS)
    .select('*')
    .in('candidate_id', candidateIds);
  if (error) throw new Error(`listContactsForCandidates: ${error.message}`);
  return data || [];
}
