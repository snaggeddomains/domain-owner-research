import { isAuthed } from '../lib/auth.js';
import { runTool } from '../lib/sources/index.js';
import { normalizeDomain } from '../lib/util.js';
import { domainRenewal } from '../lib/evaluate/renewal.js';

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

  // Special case: ?source=renewal&domain= → premium-aware renewal + raw Porkbun
  // checkDomain response (verifies the keys + shows whether registered domains carry
  // pricing). Not a registered "source", so handle it before runTool.
  if (source === 'renewal') {
    const d = args.domain || '';
    // ONE checkDomain call (it's rate-limited to 1/10s) — debug:true returns the raw
    // Porkbun response alongside the parsed renewal so we can see both.
    const renewal = await domainRenewal(d, process.env, { debug: true }).catch((e) => ({ error: String((e && e.message) || e) }));
    const raw = renewal && renewal._raw;
    if (renewal && renewal._raw !== undefined) delete renewal._raw;
    res.status(200).json({ source, domain: d, renewal, raw_checkDomain: raw });
    return;
  }

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
