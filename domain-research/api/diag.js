import { isAuthed } from '../lib/auth.js';
import { runTool } from '../lib/sources/index.js';
import { normalizeDomain } from '../lib/util.js';

// Some sources (e.g. registration_cluster) do multi-step lookups; give them room.
export const config = { maxDuration: 60 };

// Debug helper: run ONE source in isolation (auth-gated) to verify wiring —
// e.g. DomainIQ-via-Fixie — without spending a full LLM run.
//   /api/diag?source=domainiq_lookup&domain=example.com
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const source = typeof req.query.source === 'string' ? req.query.source : '';
  if (!source) {
    res.status(400).json({ error: 'Provide ?source=<tool_name> plus its args, e.g. &domain= / &nameserver= / &term= / &ip=' });
    return;
  }

  // Pass through every query param (except `source`) as the tool's args, so any
  // source can be exercised: domain, nameserver, term, ip, etc.
  const { source: _omit, ...rest } = req.query;
  const args = {};
  for (const [k, v] of Object.entries(rest)) args[k] = Array.isArray(v) ? v[0] : v;
  if (args.domain) args.domain = normalizeDomain(args.domain);

  const started = Date.now();
  const result = await runTool(source, args, process.env);
  res.status(200).json({
    source,
    args,
    proxy_configured: Boolean(process.env.FIXIE_URL || process.env.DOMAINIQ_PROXY_URL),
    ms: Date.now() - started,
    ...result,
  });
}
