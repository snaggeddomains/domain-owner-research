import { getDb } from './supabase.js';

// Sales Research Agent persistence (see SALES_RESEARCH_SPEC.md). Three tables:
// projects (one seed domain we're selling) → candidates (buyer companies) →
// contacts (decision-makers, enriched on demand).
const PROJECTS = 'domain_research_sales_projects';
const CANDIDATES = 'domain_research_sales_candidates';
const CONTACTS = 'domain_research_sales_contacts';

const normCo = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// MERGE legacy duplicate projects for a name into one canonical hub — moves every
// other project's candidates onto `canonicalId`, dedupes by domain (keeping the
// richest row: target > shortlisted > has-notes > enriched), then deletes the now-
// empty duplicate projects. Fail-safe (best-effort; never throws to the caller).
async function consolidateProjectsForName(db, canonicalId, otherIds) {
  if (!otherIds.length) return;
  try {
    await db.from(CANDIDATES).update({ project_id: canonicalId }).in('project_id', otherIds);
    const { data: all } = await db.from(CANDIDATES)
      .select('id,domain,company,is_target,shortlist_rank,notes,firmographics,score').eq('project_id', canonicalId);
    const rank = (r) => (r.is_target ? 8 : 0) + (r.shortlist_rank != null ? 4 : 0) + (r.notes ? 2 : 0) + (r.firmographics ? 1 : 0) + (Number(r.score) || 0) / 1000;
    const best = new Map(); const dropIds = [];
    for (const r of (all || [])) {
      const key = String(r.domain || '').toLowerCase() || (r.company ? `co:${normCo(r.company)}` : `id:${r.id}`);
      const prev = best.get(key);
      if (!prev) { best.set(key, r); continue; }
      if (rank(r) > rank(prev)) { dropIds.push(prev.id); best.set(key, r); } else { dropIds.push(r.id); }
    }
    for (let i = 0; i < dropIds.length; i += 200) await db.from(CANDIDATES).delete().in('id', dropIds.slice(i, i + 200));
    await db.from(PROJECTS).delete().in('id', otherIds);   // now empty (candidates moved off)
  } catch { /* best-effort — a partial merge still leaves the canonical hub usable */ }
}

// FIND-OR-CREATE by NAME (normalized seed domain). The target list is a durable
// per-name asset, so re-running research REUSES the same hub instead of forking a
// fresh empty list (see SALES_HUB_SPEC.md "master list"). Legacy duplicate projects
// for a name are CONSOLIDATED into the one holding the most targets (candidates
// merged + deduped by domain) so counts are consistent across every entry point.
export async function createSalesProject({ seed_domain, seed_sld, filters = null, created_by = null }) {
  const db = getDb();
  const norm = String(seed_domain || '').trim().toLowerCase();
  if (norm) {
    const { data: projs } = await db.from(PROJECTS).select('id').ilike('seed_domain', norm).order('created_at', { ascending: false });
    if (projs && projs.length) {
      let chosen = projs[0].id;                         // default: newest
      if (projs.length > 1) {
        const ids = projs.map((p) => p.id);
        const { data: tg } = await db.from(CANDIDATES).select('project_id').in('project_id', ids).eq('is_target', true);
        const counts = {};
        for (const r of (tg || [])) counts[r.project_id] = (counts[r.project_id] || 0) + 1;
        // Canonical = most targets, tie-broken by newest (ids is created-desc).
        chosen = ids.slice().sort((a, b) => (counts[b] || 0) - (counts[a] || 0))[0];
        await consolidateProjectsForName(db, chosen, ids.filter((id) => id !== chosen));
      }
      await db.from(PROJECTS).update({ status: 'pending', stage: null, error: null }).eq('id', chosen);
      return chosen;
    }
  }
  const row = { seed_domain: norm || seed_domain, seed_sld, status: 'pending' };
  if (filters) row.filters = filters;
  if (created_by) row.created_by = created_by;
  const { data, error } = await db.from(PROJECTS).insert(row).select('id').single();
  if (error) throw new Error(`createSalesProject: ${error.message}`);
  return data.id;
}

// One-time cleanup: merge every name's duplicate projects into a single canonical
// hub (pure DB — no re-research, no credits spent). Returns a summary.
export async function consolidateAllDuplicateProjects() {
  const db = getDb();
  const { data: projs } = await db.from(PROJECTS).select('id,seed_domain').order('created_at', { ascending: false });
  if (!projs) return { names: 0, projects_removed: 0 };
  const byName = new Map();
  for (const p of projs) {
    const k = String(p.seed_domain || '').toLowerCase();
    if (!k) continue;
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(p.id);
  }
  let names = 0; let removed = 0;
  for (const [, ids] of byName) {
    if (ids.length < 2) continue;
    const { data: tg } = await db.from(CANDIDATES).select('project_id').in('project_id', ids).eq('is_target', true);
    const counts = {};
    for (const r of (tg || [])) counts[r.project_id] = (counts[r.project_id] || 0) + 1;
    const chosen = ids.slice().sort((a, b) => (counts[b] || 0) - (counts[a] || 0))[0];   // most targets, tie → newest
    await consolidateProjectsForName(db, chosen, ids.filter((id) => id !== chosen));
    names += 1; removed += ids.length - 1;
  }
  return { names, projects_removed: removed };
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

// The master-directory view: each per-name hub + how many targets / top fits it holds.
export async function listSalesProjectsWithCounts({ limit = 50, q = '' } = {}) {
  const projects = await listSalesProjects({ limit, q });
  if (!projects.length) return projects;
  const ids = projects.map((p) => p.id);
  const { data, error } = await getDb().from(CANDIDATES).select('project_id,shortlist_rank').eq('is_target', true).in('project_id', ids);
  if (error) return projects.map((p) => ({ ...p, target_count: 0, top_fit_count: 0 }));   // fail-open (pre-migration)
  const t = {}; const f = {};
  for (const r of (data || [])) { t[r.project_id] = (t[r.project_id] || 0) + 1; if (r.shortlist_rank != null) f[r.project_id] = (f[r.project_id] || 0) + 1; }
  return projects.map((p) => ({ ...p, target_count: t[p.id] || 0, top_fit_count: f[p.id] || 0 }));
}

export async function setSalesProjectStatus(id, status, stage = null, error = null) {
  const patch = { status };
  if (stage !== null) patch.stage = stage;
  if (error !== null) patch.error = String(error).slice(0, 2000);
  const { error: err } = await getDb().from(PROJECTS).update(patch).eq('id', id);
  if (err) throw new Error(`setSalesProjectStatus: ${err.message}`);
}

// Bulk-insert resolved candidates for a project. DEDUPES against candidates already
// on this (now canonical, per-name) project — a re-run appends only genuinely-new
// companies and never touches existing rows, so targets / notes / stage persist.
export async function insertSalesCandidates(projectId, candidates) {
  if (!candidates.length) return [];
  const { data: existing } = await getDb().from(CANDIDATES).select('domain,company').eq('project_id', projectId);
  const haveDomain = new Set((existing || []).map((r) => String(r.domain || '').toLowerCase()).filter(Boolean));
  const haveCompany = new Set((existing || []).map((r) => normCo(r.company)).filter(Boolean));
  candidates = candidates.filter((c) => {
    const d = String(c.domain || '').toLowerCase();
    if (d) return !haveDomain.has(d);                   // dedupe by domain (the strong key)
    const co = normCo(c.company);                        // no domain → dedupe by company name
    return !(co && haveCompany.has(co));
  });
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

// Dismiss / un-dismiss a candidate — a NOT-A-FIT triage flag. A dismissed row is
// hidden from Explore/Beast Mode by default (viewable via "Show dismissed") and can
// be restored later. Dismiss also demotes it off the target list (a dismissed name
// isn't a target); restore leaves is_target alone (it just un-hides). Strip-and-retry
// so it degrades gracefully before 0020_sales_dismissed.sql is applied.
export async function dismissCandidates(ids, dismissed = true) {
  if (!ids.length) return 0;
  const patch = dismissed
    ? { dismissed: true, dismissed_at: new Date().toISOString(), is_target: false, shortlist_rank: null, shortlisted_at: null }
    : { dismissed: false, dismissed_at: null };
  const ok = await updateCandidatesSafe(patch, (q) => q.in('id', ids));
  return ok ? ids.length : 0;
}

// Dismiss / restore a BEAST-MODE (live-sweep) row BY DOMAIN. Beast Mode rows aren't
// persisted candidates, so we dismiss the existing candidate if one exists (an
// upgrade that also showed in Beast Mode), else UPSERT a minimal dismissed candidate
// so the name stops re-surfacing on future sweeps. Restore just clears the flag.
export async function dismissExtensionDomain(projectId, row = {}, dismissed = true) {
  const domain = String(row.domain || '').trim().toLowerCase();
  if (!projectId || !domain) return null;
  const db = getDb();
  const { data: existing } = await db.from(CANDIDATES)
    .select('id').eq('project_id', projectId).ilike('domain', domain).limit(1);
  const id = existing && existing[0] && existing[0].id;
  if (id) { await dismissCandidates([id], dismissed); return id; }
  if (!dismissed) return null;                                  // nothing to restore
  let ins = {
    project_id: projectId,
    domain,
    company: row.company || null,
    category: (row.kind === 'prefix' || row.kind === 'suffix') ? row.kind : 'tld_variant',
    status: row.category || 'unknown',
    dismissed: true,
    dismissed_at: new Date().toISOString(),
  };
  for (let i = 0; i < 6; i++) {
    const { data, error } = await db.from(CANDIDATES).insert(ins).select('id').single();
    if (!error) return data.id;
    const m = /column "?([a-z_]+)"?|Could not find the '([a-z_]+)' column/i.exec(error.message || '');
    const col = m && (m[1] || m[2]);
    if (col === 'dismissed') return null;                       // pre-migration → don't insert a VISIBLE phantom
    if (!col || !(col in ins)) throw new Error(`dismissExtensionDomain: ${error.message}`);
    const { [col]: _d, ...rest } = ins; ins = rest;
  }
  return null;
}

// Beast Mode results are SAVED per project (a full sweep is expensive) so the surface
// loads instantly; Refresh re-sweeps + overwrites. Both strip-and-retry so they no-op
// gracefully before the ext_results/ext_swept_at columns are migrated.
export async function saveExtResults(projectId, payload) {
  if (!projectId) return false;
  let patch = { ext_results: payload || null, ext_swept_at: new Date().toISOString() };
  for (let i = 0; i < 4; i++) {
    if (!Object.keys(patch).length) return false;
    const { error } = await getDb().from(PROJECTS).update(patch).eq('id', projectId);
    if (!error) return true;
    const m = /column "?([a-z_]+)"?|Could not find the '([a-z_]+)' column/i.exec(error.message || '');
    const col = m && (m[1] || m[2]);
    if (!col || !(col in patch)) return false;
    const { [col]: _d, ...rest } = patch; patch = rest;
  }
  return false;
}

export async function getExtResults(projectId) {
  if (!projectId) return null;
  const { data, error } = await getDb().from(PROJECTS)
    .select('ext_results,ext_swept_at').eq('id', projectId).maybeSingle();
  if (error) return null;                                       // pre-migration → treat as none saved
  if (!data || !data.ext_results) return null;
  return { ...data.ext_results, swept_at: data.ext_swept_at };
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

// Promote ACTIVE-site extensions to targets (from the Extensions sweep). Upserts a
// candidate per domain — promotes an existing candidate, or inserts a new tld_variant
// candidate carrying the resolved company/firmographics — and marks it a target.
export async function addExtensionTargets(projectId, rows) {
  if (!rows || !rows.length) return 0;
  const db = getDb();
  const domains = rows.map((r) => String(r.domain || '').toLowerCase()).filter(Boolean);
  const { data: existing } = await db.from(CANDIDATES).select('id,domain').eq('project_id', projectId).in('domain', domains);
  const byDomain = new Map((existing || []).map((c) => [String(c.domain || '').toLowerCase(), c.id]));
  const promoteIds = [];
  let toInsert = [];
  for (const r of rows) {
    const d = String(r.domain || '').toLowerCase();
    if (!d) continue;
    if (byDomain.has(d)) { promoteIds.push(byDomain.get(d)); continue; }
    toInsert.push({
      project_id: projectId, domain: d, company: r.company || d, company_url: `https://${d}`,
      category: 'upgrade', subtype: 'tld_variant', status: 'active',
      is_target: true, added_at: new Date().toISOString(),
      employee_count: r.employee_count ?? null, location: r.location || null, funding: r.funding || null,
      tier: r.tier || null, firmographics: r.firmographics || null,
      match_reason: 'Exact name on another extension (active site)',
    });
  }
  if (promoteIds.length) await addToTargets(projectId, promoteIds);
  for (let i = 0; toInsert.length && i < 6; i++) {
    const { error } = await db.from(CANDIDATES).insert(toInsert);
    if (!error) break;
    const m = /column "?([a-z_]+)"?|Could not find the '([a-z_]+)' column/i.exec(error.message || '');
    const col = m && (m[1] || m[2]);
    if (!col) throw new Error(`addExtensionTargets: ${error.message}`);
    toInsert = toInsert.map(({ [col]: _drop, ...x }) => x);   // strip a not-yet-migrated column + retry
  }
  return promoteIds.length + toInsert.length;
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
// qualify_status records that a qualify was ATTEMPTED ('done' matched / 'empty' no
// coverage) so the UI can distinguish "searched, nothing found" from "never tried".
export async function updateCandidateQualification(id, firmo, atp) {
  const patch = {
    firmographics: firmo || null,
    tier: atp.tier,
    score: { strong: 3, medium: 2, low: 1, unknown: 0 }[atp.tier],
    match_reason: (atp.reasons || []).join(' · ') || null,
    qualify_status: firmo ? 'done' : 'empty',
  };
  if (firmo) {
    patch.employee_count = firmo.employees ?? null;
    patch.funding = firmo.funding ?? null;
    patch.location = firmo.location ?? null;
    if (firmo.company) patch.company = firmo.company;
  }
  // Strip-and-retry so a not-yet-migrated qualify_status column doesn't fail the write.
  const ok = await updateCandidatesSafe(patch, (q) => q.eq('id', id));
  if (!ok) throw new Error('updateCandidateQualification: write failed');
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
