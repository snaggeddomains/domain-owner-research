import { getDb } from './supabase.js';

const RUNS = 'domain_research_runs';

export async function createRun({ domain, question, depth = 'standard', user_id = null }) {
  const row = { domain, question: question || null, depth, status: 'queued' };
  if (user_id) row.user_id = user_id;
  const { data, error } = await getDb().from(RUNS).insert(row).select('id').single();
  if (error) throw new Error(`createRun: ${error.message}`);
  return data.id;
}

export async function getRun(id) {
  const { data, error } = await getDb().from(RUNS).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getRun: ${error.message}`);
  return data || null;
}

// Resolve a short share token (the leading hex chars of a run id) to the full run
// id, scoped by the slug's domain so the scan is tiny — a domain has only a handful
// of reports. Lets share links stay short (/research/r/<domain>-<8hex>) without a
// schema change. Returns the newest matching id, or null.
export async function resolveRunIdByShort(domain, token) {
  const t = String(token || '').toLowerCase().replace(/[^0-9a-f]/g, '');
  const dom = String(domain || '').toLowerCase().trim();
  if (!dom || t.length < 4) return null;
  const { data, error } = await getDb()
    .from(RUNS)
    .select('id, created_at')
    .ilike('domain', dom)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return null;
  const hit = data.find((r) => String(r.id || '').replace(/-/g, '').toLowerCase().startsWith(t));
  return hit ? hit.id : null;
}

// Lightweight list for the Projects view (no heavy report payload). Optional
// case-insensitive domain filter.
//
// `statuses` are matched unconditionally. `reportStatuses` are matched ONLY when
// a report exists — this is how an errored deep pass that nonetheless saved a
// free pre-flight report (deep-pass timeout) still shows up in Recent and stays
// reusable, instead of silently disappearing.
export async function listRuns({ q = '', limit = 100, statuses = null, reportStatuses = null } = {}) {
  let query = getDb()
    .from(RUNS)
    .select('id,domain,status,stage,created_at,finished_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  const ors = [];
  if (statuses && statuses.length) ors.push(...statuses.map((s) => `status.eq.${s}`));
  if (reportStatuses && reportStatuses.length) {
    for (const s of reportStatuses) ors.push(`and(status.eq.${s},report.not.is.null)`);
  }
  if (ors.length) query = query.or(ors.join(','));
  if (q) query = query.ilike('domain', `%${q}%`);
  const { data, error } = await query;
  if (error) throw new Error(`listRuns: ${error.message}`);
  return data || [];
}

export async function setRunStatus(id, status, stage = null) {
  const patch = { status };
  if (stage !== null) patch.stage = stage;
  const { error } = await getDb().from(RUNS).update(patch).eq('id', id);
  if (error) throw new Error(`setRunStatus: ${error.message}`);
}

// Bump a run's created_at to now so a re-submitted (reused) domain floats back to
// the TOP of the Recent list — Recent orders by created_at desc. Returns the new
// timestamp. Best-effort: a failure just leaves the run where it was.
export async function touchRun(id) {
  const now = new Date().toISOString();
  const { error } = await getDb().from(RUNS).update({ created_at: now }).eq('id', id);
  if (error) throw new Error(`touchRun: ${error.message}`);
  return now;
}

export async function saveRunReport(id, report) {
  const { error } = await getDb()
    .from(RUNS)
    .update({ status: 'done', stage: 'done', report, finished_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`saveRunReport: ${error.message}`);
}

// Patch ONLY the report jsonb (no status/finished_at change) — used to merge
// on-demand enrichments (e.g. a phone pulled later) into an already-done run.
export async function updateRunReport(id, report) {
  const { error } = await getDb().from(RUNS).update({ report }).eq('id', id);
  if (error) throw new Error(`updateRunReport: ${error.message}`);
}

export async function failRun(id, message) {
  const { error } = await getDb()
    .from(RUNS)
    .update({ status: 'error', error: String(message).slice(0, 2000), finished_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`failRun: ${error.message}`);
}
