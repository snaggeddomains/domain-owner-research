import { getDb } from './supabase.js';

// Corporate Portfolios persistence. A "run" is one reverse-WHOIS pull for a
// company (or registrant email); its premium domains land in a child table.
const RUNS = 'domain_research_portfolio_runs';
const DOMAINS = 'domain_research_portfolio_domains';

export async function createPortfolioRun({ query, search_type, filter = null, created_by = null }) {
  const row = { query, search_type, status: 'pending' };
  if (filter) row.filter = filter;
  if (created_by) row.created_by = created_by;
  const { data, error } = await getDb().from(RUNS).insert(row).select('id').single();
  if (error) throw new Error(`createPortfolioRun: ${error.message}`);
  return data.id;
}

export async function getPortfolioRun(id) {
  const { data, error } = await getDb().from(RUNS).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getPortfolioRun: ${error.message}`);
  return data || null;
}

export async function listPortfolioRuns({ limit = 50, q = '' } = {}) {
  let query = getDb()
    .from(RUNS)
    .select('id,query,search_type,status,premium_count,total_results,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (q) query = query.ilike('query', `%${q}%`);
  const { data, error } = await query;
  if (error) throw new Error(`listPortfolioRuns: ${error.message}`);
  return data || [];
}

export async function setPortfolioRunStatus(id, status, patch = {}) {
  const update = { status, ...patch };
  if (update.error != null) update.error = String(update.error).slice(0, 2000);
  const { error } = await getDb().from(RUNS).update(update).eq('id', id);
  if (error) throw new Error(`setPortfolioRunStatus: ${error.message}`);
}

export async function insertPortfolioDomains(runId, domains) {
  if (!domains.length) return;
  const rows = domains.map((d) => ({
    run_id: runId,
    domain: d.domain,
    sld_length: d.domain ? d.domain.split('.')[0].length : null,
    premium_reason: d.premium_reason || null,
    created: d.created || null,
    registrar: d.registrar || null,
  }));
  const CHUNK = 1000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await getDb().from(DOMAINS).insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(`insertPortfolioDomains: ${error.message}`);
  }
}

export async function listPortfolioDomains(runId, { limit = 1000 } = {}) {
  const { data, error } = await getDb()
    .from(DOMAINS)
    .select('domain,sld_length,premium_reason,created,registrar')
    .eq('run_id', runId)
    .order('sld_length', { ascending: true, nullsFirst: false })
    .order('domain', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`listPortfolioDomains: ${error.message}`);
  return data || [];
}
