// Corporate Portfolios API. Gated by the `research.portfolio` permission.
//
//   POST {action:'create', company?, email?, filter?}  → enqueue a run, returns {run_id}
//   GET  ?id=<runId>                                    → {run, domains}
//   GET  ?id=<runId>&format=csv                         → CSV download of the domains
//   GET  ?list=1&q=                                     → recent runs
//
// The reverse-WHOIS pull + premium filter run async in the runCorporatePortfolio
// Inngest fn (a big registrant paginates well past the 60s API cap), so create
// returns immediately and the UI polls.

import { isAuthed, requirePermission } from '../lib/auth.js';
import { isDbConfigured } from '../lib/db/supabase.js';
import { inngest, PORTFOLIO_REQUESTED } from '../lib/inngest/client.js';
import { normalizeFilter, DEFAULT_FILTER } from '../lib/portfolio/premium.js';
import { classifySeed } from '../lib/portfolio/registrant.js';
import {
  createPortfolioRun, getPortfolioRun, listPortfolioRuns, listPortfolioDomains,
} from '../lib/db/portfolio.js';

export const config = { maxDuration: 60 };

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function handleGet(req, res) {
  if (req.query.list != null) {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const runs = await listPortfolioRuns({ q, limit });
    res.status(200).json({ runs });
    return;
  }
  const id = String(req.query.id || '').trim();
  if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
  const run = await getPortfolioRun(id);
  if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
  const domains = await listPortfolioDomains(id, { limit: 50000 });

  if (String(req.query.format || '').toLowerCase() === 'csv') {
    const header = 'domain,premium,premium_reason,matched_via,sld_length,created,registrar';
    const lines = domains.map((d) => [d.domain, d.premium_reason ? 'yes' : 'no', d.premium_reason, d.matched_via, d.sld_length, d.created, d.registrar].map(csvEscape).join(','));
    const safe = String(run.query || 'portfolio').replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="portfolio_${safe}.csv"`);
    res.status(200).send([header, ...lines].join('\n'));
    return;
  }

  res.status(200).json({
    run: {
      id: run.id, query: run.query, search_type: run.search_type, status: run.status,
      stage: run.stage, error: run.error, filter: run.filter,
      premium_count: run.premium_count, total_results: run.total_results,
      credits_used: run.credits_used, capped: run.capped, created_at: run.created_at,
    },
    domains,
  });
}

async function handleCreate(body, res, user) {
  // One seed field: a company DOMAIN (best — we derive the registrant org/email
  // from its WHOIS), a company NAME, or a registrant EMAIL. (company/email kept
  // for back-compat.) The async fn classifies + derives the reverse-WHOIS keys.
  const query = String(body.seed || body.query || body.email || body.company || '').trim();
  if (!query) { res.status(400).json({ error: 'Provide a company domain (e.g. meta.com), company name, or registrant email.' }); return; }
  const search_type = classifySeed(query).type; // 'domain' | 'company' | 'email'

  const filter = body.filter ? normalizeFilter(body.filter) : { ...DEFAULT_FILTER };
  const runId = await createPortfolioRun({ query, search_type, filter, created_by: user?.id || null });
  await inngest.send({ name: PORTFOLIO_REQUESTED, data: { runId } });
  res.status(202).json({ run_id: runId, query, search_type });
}

export default async function handler(req, res) {
  if (!isAuthed(req)) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (!isDbConfigured()) { res.status(500).json({ error: 'Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }); return; }
  const user = await requirePermission(req, res, 'research.portfolio');
  if (!user) return;
  try {
    if (req.method === 'GET') return await handleGet(req, res);
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const action = String(body.action || 'create');
      if (action === 'create') return await handleCreate(body, res, user);
      res.status(400).json({ error: `Unknown action: ${action}` });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
