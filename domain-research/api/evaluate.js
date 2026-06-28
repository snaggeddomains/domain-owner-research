// SNAP Eval — acquisition/resale evaluation for a single domain. Pulls comps
// (NameBio + internal DB + Snagged deal history), the live use, marketplace
// listing, AI appraisals, forum/web chatter, prior emails, and the buyer pool,
// runs the deterministic valuation + price-band model, and an LLM verdict.
//
// Routing:
//   GET /api/evaluate?domain=<d>[&price=<n>][&refresh=1]  → run (cache-first by domain)
//   GET /api/evaluate?list=1[&limit=10]                   → recent evaluations
//
// Cache-first by DOMAIN (kind 'ev'): the expensive run happens once per domain;
// changing the PRICE never re-spends — the price→band overlay is computed instantly
// from the cached fair value. `refresh=1` forces a fresh run.

import { isAuthed, requirePermission } from '../lib/auth.js';
import { withCategory } from '../lib/db/usage.js';
import { cleanDomainInput } from '../lib/util.js';
import { saveToolLookup, listToolLookups, getToolLookup } from '../lib/db/tools.js';
import { evaluateDomain } from '../lib/evaluate/evaluate.js';
import { bandForPrice } from '../lib/evaluate/score.js';

export const config = { maxDuration: 60 };

const KIND = 'ev';

// Attach "which band does this price land in" to a finished evaluation, computed
// from the (already-adjusted) fair-value mid. Instant + deterministic — no spend.
function priceOverlay(evalReport, price) {
  const p = Number(price) > 0 ? Number(price) : null;
  if (!p) return null;
  const mid = evalReport && evalReport.valuation && evalReport.valuation.fair_value && evalReport.valuation.fair_value.mid;
  const band = mid > 0 ? bandForPrice(p, mid) : null;
  if (!band) return null;
  return { price: p, band: { key: band.key, label: band.label, color: band.color }, ratio: Math.round(band.ratio * 100) / 100 };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const user = await requirePermission(req, res, 'evaluate');
  if (!user) return; // requirePermission already wrote 401/403

  // Recent evaluations list.
  if (req.query.list) {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const lookups = await listToolLookups(KIND, limit);
    res.status(200).json({ lookups });
    return;
  }

  let domain;
  try {
    domain = cleanDomainInput(req.query.domain);
  } catch (e) {
    res.status(400).json({ error: String((e && e.message) || e) });
    return;
  }
  const price = Number(req.query.price) > 0 ? Number(req.query.price) : null;
  const refresh = req.query.refresh === '1' || req.query.refresh === 'true';

  // Cache-first by domain.
  if (!refresh) {
    const row = await getToolLookup(KIND, domain);
    if (row && row.data) {
      res.status(200).json({ domain, cached: true, updated_at: row.updated_at, price_overlay: priceOverlay(row.data, price), evaluation: row.data });
      return;
    }
  }

  try {
    // Tag the (paid) comp/appraisal/firmographics spend to the evaluate module.
    const evaluation = await withCategory('evaluate', () => evaluateDomain({ domain, env: process.env }));
    await saveToolLookup(KIND, domain, evaluation);
    res.status(200).json({ domain, cached: false, updated_at: new Date().toISOString(), price_overlay: priceOverlay(evaluation, price), evaluation });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
