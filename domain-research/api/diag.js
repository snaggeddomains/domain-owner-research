import { isAuthed } from '../lib/auth.js';
import { runTool } from '../lib/sources/index.js';
import { normalizeDomain } from '../lib/util.js';

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
    res.status(400).json({ error: 'Provide ?source=<tool_name>&domain=<domain>' });
    return;
  }
  const domain = normalizeDomain(req.query.domain || 'example.com');

  const started = Date.now();
  const result = await runTool(source, { domain }, process.env);
  res.status(200).json({
    source,
    domain,
    proxy_configured: Boolean(process.env.FIXIE_URL || process.env.DOMAINIQ_PROXY_URL),
    ms: Date.now() - started,
    ...result,
  });
}
