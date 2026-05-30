import { isAuthed, currentUser, userCan, moduleForSource } from '../lib/auth.js';
import { runTool } from '../lib/sources/index.js';
import { normalizeDomain } from '../lib/util.js';

// Standalone tool runner — invokes one source directly (Trademark, Appraisal,
// …) outside the research pipeline. Auth-gated; spends that source's credits.
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const source = typeof req.query.source === 'string' ? req.query.source : '';
  if (!source) {
    res.status(400).json({ error: 'Missing ?source=' });
    return;
  }
  // Gate by the module the source belongs to (trademark_search → trademark,
  // appraise_lookup → appraisal, others → domain_owner).
  const user = await currentUser(req);
  if (user && !userCan(user, moduleForSource(source))) {
    res.status(403).json({ error: `You don't have access to the ${moduleForSource(source)} module` });
    return;
  }
  const { source: _omit, ...rest } = req.query;
  const args = {};
  for (const [k, v] of Object.entries(rest)) args[k] = Array.isArray(v) ? v[0] : v;
  if (args.domain) args.domain = normalizeDomain(args.domain);

  const result = await runTool(source, args, process.env);
  res.status(result.ok ? 200 : 400).json({ source, ...result });
}
