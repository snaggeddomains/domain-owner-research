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

// ── Sales Hub: per-name target list (see SALES_HUB_SPEC.md) ─────────────────
// A candidate becomes a first-class TARGET (is_target) — promoted from Explore
// or added manually. All writes strip-and-retry a not-yet-migrated column
// (42703 / "Could not find the 'x' column") so the module degrades gracefully
// before 0019_sales_targets.sql is applied (the features light up once it is).

async function updateCandidatesSafe(patch, applyFilter) {
  let p = { ...patch };
  for (let i = 0; i < 6; i++) {
    if (!Object.keys(p).length) return false;                 // nothing left to write (pre-migration)
    const { error } = await applyFilter(getDb().from(CANDIDATES).update(p));
    if (!error) return true;
    const m = /column "?([a-z_]+)"?|Could not find the '([a-z_]+)' column/i.exec(error.message || '');
    const col = m && (m[1] || m[2]);
    if (!col || !(col in p)) throw new Error(`updateCandidates: ${error.message}`);
    const { [col]: _drop, ...rest } = p; p = rest;
  }
  return false;
}

// Promote checked Explore candidates onto the target list. Stamps added_at only
// on rows not already on the list (a re-add never resets the date).
export async function addToTargets(projectId, ids) {
  if (!ids.length) return 0;
  await getDb().from(CANDIDATES)
    .update({ added_at: new Date().toISOString() })
    .eq('project_id', projectId).in('id', ids).is('added_at', null);   // pre-migration: errors are ignored
  const ok = await updateCandidatesSafe({ is_target: true }, (q) => q.eq('project_id', projectId).in('id', ids));
  return ok ? ids.length : 0;
}

// Add a company by hand (contact info optional — it lives on the list like any
// discovered target). category='manual' so it never shows in Explore's paths.
export async function addManualTarget(projectId, fields = {}) {
  let row = {
    project_id: projectId,
    company: fields.company || null,
    domain: fields.domain || null,
    company_url: fields.company_url || null,
    description: fields.description || null,
    location: fields.location || null,
    category: 'manual',
    status: 'unknown',
    manual: true,
    is_target: true,
    notes: fields.notes || null,
    added_at: new Date().toISOString(),
  };
  for (let i = 0; i < 6; i++) {
    const { data, error } = await getDb().from(CANDIDATES).insert(row).select('*').single();
    if (!error) return data;
    const m = /column "?([a-z_]+)"?|Could not find the '([a-z_]+)' column/i.exec(error.message || '');
    const col = m && (m[1] || m[2]);
    if (!col || !(col in row)) throw new Error(`addManualTarget: ${error.message}`);
    const { [col]: _drop, ...rest } = row; row = rest;
  }
  throw new Error('addManualTarget: could not insert');
}

// Remove from the target list (demote — the row stays a candidate in Explore,
// not destroyed). Also clears any top-fit mark.
export async function removeTargets(ids) {
  if (!ids.length) return 0;
  const ok = await updateCandidatesSafe(
    { is_target: false, shortlist_rank: null, shortlisted_at: null },
    (q) => q.in('id', ids),
  );
  return ok ? ids.length : 0;
}

// Set / clear the ⭐ Top-fit mark (a human "best fit for this name" judgment,
// independent of contact status). Stamps shortlisted_at on the FIRST mark only.
export async function setShortlistRank(id, rank) {
  if (rank == null) {
    await updateCandidatesSafe({ shortlist_rank: null }, (q) => q.eq('id', id));
    return;
  }
  await getDb().from(CANDIDATES)
    .update({ shortlisted_at: new Date().toISOString() })
    .eq('id', id).is('shortlisted_at', null);                         // pre-migration: errors ignored
  await updateCandidatesSafe({ shortlist_rank: Number(rank) }, (q) => q.eq('id', id));
}

const TARGET_EDITABLE = ['notes', 'company', 'domain', 'description', 'location'];
// Edit a target's inline fields (notes/comments + basic identity). Blank → null.
export async function updateTarget(id, patch = {}) {
  const clean = {};
  for (const k of TARGET_EDITABLE) if (k in patch) clean[k] = patch[k] === '' ? null : patch[k];
  if (!Object.keys(clean).length) return;
  await updateCandidatesSafe(clean, (q) => q.eq('id', id));
}

// Fill in firmographics + ability-to-pay after a manual Apollo qualify.
export async function updateCandidateQualification(id, firmo, atp) {
  const patch = {
    firmographics: firmo || null,
    tier: atp.tier,
    score: { strong: 3, medium: 2, low: 1, unknown: 0 }[atp.tier],
    match_reason: (atp.reasons || []).join(' · ') || null,
  };
  if (firmo) {
    patch.employee_count = firmo.employees ?? null;
    patch.funding = firmo.funding ?? null;
    patch.location = firmo.location ?? null;
    if (firmo.company) patch.company = firmo.company;
  }
  const { error } = await getDb().from(CANDIDATES).update(patch).eq('id', id);
  if (error) throw new Error(`updateCandidateQualification: ${error.message}`);
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
