// SNAP Research cron — seed the dictionary + enrich the stalest/most-common unscanned <word>.com
// with abandonment + value clues, paced so a tick stays within budget. CRON_SECRET-gated.
// Knobs: ?curate=N&scan=N&nocurate&noscan. Fail-open (a bad word never sinks the tick).

import { curateSlice } from '../../lib/snapResearch/candidates.js';
import { enrichOne } from '../../lib/snapResearch/enrich.js';
import { dueForScan, updateSnapRow, snapResearchConfigured } from '../../lib/db/snapResearch.js';

export const config = { maxDuration: 60 };

const SCAN_LIMIT = Number(process.env.SNAP_RESEARCH_SCAN_LIMIT) || 30;
const CONCURRENCY = Number(process.env.SNAP_RESEARCH_CONCURRENCY) || 3;
const CURATE_PAGE = Number(process.env.SNAP_RESEARCH_CURATE) || 1500;

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!snapResearchConfigured()) return res.status(200).json({ ok: true, configured: false });

  const q = req.query || {};
  const out = { ok: true };

  // 1) Curate a slice (seed new <word>.com rows). Pure DB, fast.
  if (q.nocurate === undefined) {
    try {
      out.curate = await curateSlice({ pageSize: q.curate ? Number(q.curate) : CURATE_PAGE });
    } catch (e) { out.curate = { error: String(e?.message || e) }; }
  }

  // 2) Scan due rows — enrich the stalest/most-common unscanned, bounded concurrency.
  if (q.noscan === undefined) {
    const limit = q.scan ? Number(q.scan) : SCAN_LIMIT;
    let rows = [];
    try { rows = await dueForScan(limit); } catch { rows = []; }
    let ok = 0, err = 0, cands = 0;
    let idx = 0;
    async function worker() {
      while (idx < rows.length) {
        const row = rows[idx++];
        try {
          const patch = await enrichOne(row);
          await updateSnapRow(row.domain, patch);
          ok++;
          if (patch.candidate) cands++;
        } catch { err++; }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));
    out.scan = { attempted: rows.length, ok, err, new_candidates: cands };
  }

  return res.status(200).json(out);
}
