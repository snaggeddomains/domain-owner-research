// Sales Research Agent API (Phase 1A). Gated by the `research.sales` permission.
//
//   POST {action:'create', domain, filters?}        → enqueue a run, returns {project_id}
//   GET  ?id=<projectId>                             → {project, candidates, contacts}
//   POST {action:'select', project_id, ids[], selected} → toggle selection
//   POST {action:'enrich', candidate_id}            → enrich one company's contacts (sync)
//
// Discovery + resolve/classify/rank run async in the runSalesResearch Inngest fn;
// contact enrich is on-demand per selected company (RocketReach), bounded so it
// stays inside the function time cap.

import { isAuthed, requirePermission } from '../lib/auth.js';
import { isDbConfigured } from '../lib/db/supabase.js';
import { inngest, SALES_RESEARCH_REQUESTED } from '../lib/inngest/client.js';
import { seedParts } from '../lib/sales/discovery/upgrade.js';
import { anglesForSeed } from '../lib/sales/discovery/angles.js';
import { discoverAngles } from '../lib/sales/discovery/keyword.js';
import { enrichCompany } from '../lib/sales/enrich/contacts.js';
import { firmographics, abilityToPay } from '../lib/sales/enrich/firmographics.js';
import {
  createSalesProject, getSalesProject, listSalesProjects, listSalesCandidates, getSalesCandidate,
  setSalesSelection, setCandidateEnrichStatus, replaceCandidateContacts, listContactsForCandidates,
  insertSalesCandidates, updateCandidateQualification,
} from '../lib/db/sales.js';

export const config = { maxDuration: 60 };

async function handleGet(req, res) {
  // List mode: recent / searchable past projects.
  if (req.query.list != null) {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const projects = await listSalesProjects({ q, limit });
    res.status(200).json({ projects });
    return;
  }
  const id = String(req.query.id || '').trim();
  if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
  const project = await getSalesProject(id);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  const candidates = await listSalesCandidates(id);
  const contacts = await listContactsForCandidates(candidates.map((c) => c.id));
  const byCand = {};
  for (const c of contacts) (byCand[c.candidate_id] ||= []).push(c);
  res.status(200).json({
    project: { id: project.id, seed_domain: project.seed_domain, status: project.status, stage: project.stage, error: project.error },
    candidates: candidates.map((c) => ({ ...c, contacts: byCand[c.id] || [] })),
  });
}

async function handleCreate(body, res, user) {
  const domain = String(body.domain || '').trim().toLowerCase();
  const { sld, domain: clean } = seedParts(domain);
  if (!sld) { res.status(400).json({ error: 'Provide a seed domain, e.g. artificial.com' }); return; }
  const projectId = await createSalesProject({
    seed_domain: clean, seed_sld: sld, filters: body.filters || null, created_by: user?.id || null,
  });
  await inngest.send({ name: SALES_RESEARCH_REQUESTED, data: { projectId } });
  res.status(202).json({ project_id: projectId, seed_domain: clean });
}

async function handleSelect(body, res) {
  const projectId = String(body.project_id || '').trim();
  const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
  if (!projectId || !ids.length) { res.status(400).json({ error: 'project_id and ids required' }); return; }
  await setSalesSelection(projectId, ids, Boolean(body.selected));
  res.status(200).json({ ok: true, updated: ids.length });
}

// Keyword/angle gate (Tier 0 + 1): enumerate buyer angles + verify the headline
// player per angle. Free preview + ~1 firmographics credit per angle.
async function handleAngles(body, res) {
  const domain = String(body.domain || '').trim().toLowerCase();
  const { sld } = seedParts(domain);
  if (!sld) { res.status(400).json({ error: 'Provide a seed domain' }); return; }
  if (!process.env.ANTHROPIC_API_KEY) { res.status(503).json({ error: 'Angle enumeration needs ANTHROPIC_API_KEY' }); return; }
  try {
    const angles = await anglesForSeed(domain, process.env, { verify: body.verify !== false });
    res.status(200).json({ angles });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}

// Tier-2: discover companies for the chosen angles (LLM expand, FREE — no Apollo)
// and add them to the buyers list UNQUALIFIED. The user qualifies manually.
async function handleResearchAngles(body, res) {
  const projectId = String(body.project_id || '').trim();
  const angles = Array.isArray(body.angles) ? body.angles : [];
  const limit = Math.max(1, Math.min(Number(body.limit) || 15, 60));
  if (!projectId || !angles.length) { res.status(400).json({ error: 'project_id and angles required' }); return; }
  if (!process.env.ANTHROPIC_API_KEY) { res.status(503).json({ error: 'Angle research needs ANTHROPIC_API_KEY' }); return; }
  const project = await getSalesProject(projectId);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  try {
    const discovered = await discoverAngles(project.seed_domain, angles, process.env, { limitPerAngle: limit });
    // Skip companies already in the project (dedupe by domain).
    const existing = new Set((await listSalesCandidates(projectId)).map((c) => (c.domain || '').toLowerCase()));
    const fresh = discovered.filter((c) => c.domain && !existing.has(c.domain.toLowerCase()));
    if (fresh.length) await insertSalesCandidates(projectId, fresh);
    res.status(200).json({ ok: true, added: fresh.length });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}

// Manual qualify: spend 1 Apollo firmographics credit per selected company to fill
// in ability-to-pay. The human cost gate before the paid step.
async function handleQualify(body, res) {
  const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
  if (!ids.length) { res.status(400).json({ error: 'ids required' }); return; }
  const out = [];
  for (const id of ids) {
    const cand = await getSalesCandidate(id);
    if (!cand) { out.push({ id, error: 'not found' }); continue; }
    if (cand.firmographics) { out.push({ id, tier: cand.tier, skipped: true }); continue; }
    let firmo = null;
    try { firmo = await firmographics(cand.domain, process.env); } catch { firmo = null; }
    const atp = abilityToPay(firmo);
    try { await updateCandidateQualification(id, firmo, atp); } catch { /* non-fatal */ }
    out.push({ id, tier: atp.tier, matched: !!firmo });
  }
  res.status(200).json({ ok: true, qualified: out });
}

async function handleEnrich(body, res) {
  const candidateId = String(body.candidate_id || '').trim();
  if (!candidateId) { res.status(400).json({ error: 'candidate_id required' }); return; }
  const cand = await getSalesCandidate(candidateId);
  if (!cand) { res.status(404).json({ error: 'Candidate not found' }); return; }
  await setCandidateEnrichStatus(candidateId, 'pending');
  try {
    const contacts = await enrichCompany(
      { company: cand.company, domain: cand.domain, employee_count: cand.employee_count },
      { env: process.env },
    );
    await replaceCandidateContacts(candidateId, contacts);
    await setCandidateEnrichStatus(candidateId, 'done');
    res.status(200).json({ ok: true, candidate_id: candidateId, contacts });
  } catch (e) {
    await setCandidateEnrichStatus(candidateId, 'failed');
    res.status(500).json({ error: String(e.message || e) });
  }
}

async function route(req, res) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const user = req._salesUser;
    const action = String(body.action || 'create');
    if (action === 'create') return handleCreate(body, res, user);
    if (action === 'angles') return handleAngles(body, res);
    if (action === 'research_angles') return handleResearchAngles(body, res);
    if (action === 'qualify') return handleQualify(body, res);
    if (action === 'select') return handleSelect(body, res);
    if (action === 'enrich') return handleEnrich(body, res);
    res.status(400).json({ error: `Unknown action: ${action}` });
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req, res) {
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (!isDbConfigured()) { res.status(500).json({ error: 'Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }); return; }
  const user = await requirePermission(req, res, 'research.sales');
  if (!user) return;
  req._salesUser = user;
  try {
    return await route(req, res);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
