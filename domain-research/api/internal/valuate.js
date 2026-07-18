// Internal, server-to-server valuation for the admin SNAP-Opportunities "worth a look"
// picks. Given a small list of domains, returns each one's Appraise.net value + TLD-demand
// count — the two lightweight signals (no NameBio comps / firmographics, so it's cheap).
// Keys (APPRAISE_NET_*, etc.) live ONLY in this app, so admin calls here instead of
// duplicating them. Both signals are cache-first per domain (kinds 'ap' / 'tc').
//
//   POST { domains: ["a.com","b.ai", …] }   header x-internal-secret: RESEARCH_INTERNAL_SECRET
//   → { results: [{ domain, appraisal:{mid,low,high}|null, tld_count, tld_band }] }
//
// Auth is the shared secret (machine-to-machine), NOT a user session — mirrors the
// admin-side internal endpoints (email-threads, sales-comps) research already calls.

import { appraisalOnly } from '../../lib/evaluate/signals.js';
import { countRegistrations } from '../../lib/evaluate/tldcount.js';
import { withCategory } from '../../lib/db/usage.js';

export const config = { maxDuration: 60 };

const MAX_DOMAINS = 25;

function tldBand(count) {
  if (count == null) return null;
  if (count >= 60) return 'high';
  if (count >= 25) return 'solid';
  if (count >= 8) return 'some';
  if (count >= 3) return 'thin';
  return 'minimal';
}

// Cap a per-domain lookup so one slow signal can't blow the function budget.
function cap(promise, ms, fallback) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function valuateOne(domain, env) {
  const [appraise, tld] = await Promise.all([
    cap(appraisalOnly(domain, env), 24000, null),
    cap(countRegistrations(domain, { env }), 12000, null),
  ]);
  const count = tld && Number.isFinite(tld.count) ? tld.count : null;
  return {
    domain,
    appraisal: appraise && appraise.mid > 0 ? { mid: appraise.mid, low: appraise.low || null, high: appraise.high || null } : null,
    tld_count: count,
    tld_band: tldBand(count),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.RESEARCH_INTERNAL_SECRET;
  if (!secret || req.headers['x-internal-secret'] !== secret) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  let domains = [];
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const raw = body.domains || (req.query && req.query.domains) || [];
    const list = Array.isArray(raw) ? raw : String(raw).split(',');
    domains = [...new Set(list.map((d) => String(d || '').trim().toLowerCase()).filter((d) => d.includes('.')))].slice(0, MAX_DOMAINS);
  } catch {
    res.status(400).json({ error: 'bad request' });
    return;
  }
  if (!domains.length) { res.status(200).json({ results: [] }); return; }

  try {
    const results = await withCategory('snap_picks', () => Promise.all(domains.map((d) => valuateOne(d, process.env))));
    res.status(200).json({ results });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
