import { research } from '../lib/agent.js';
import { isValidDomain, normalizeDomain } from '../lib/util.js';
import { checkRateLimit, clientIp } from '../lib/ratelimit.js';

// Allow longer runs: the agent loop makes several API calls in sequence.
// (Honored on Vercel plans that permit it; safe to keep otherwise.)
export const config = { maxDuration: 60 };

// Which API key the configured provider needs.
function requiredKeyVar() {
  const provider = (process.env.LLM_PROVIDER || 'claude').toLowerCase();
  return provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed — use POST' });
    return;
  }

  const keyVar = requiredKeyVar();
  if (!process.env[keyVar]) {
    res.status(500).json({ error: `Server is missing ${keyVar} for the configured LLM_PROVIDER` });
    return;
  }

  // Per-IP rate limit (Vercel KV). Protects your LLM + data-API spend.
  const rl = await checkRateLimit(clientIp(req));
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    res.status(429).json({ error: `Rate limit exceeded — try again in ${rl.retryAfter}s.` });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const domain = normalizeDomain(body.domain);
    if (!isValidDomain(domain)) {
      res.status(400).json({ error: 'Please provide a valid domain, e.g. example.com' });
      return;
    }

    const question = typeof body.question === 'string' ? body.question.slice(0, 1000) : '';
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

    const result = await research({ domain, question, history, env: process.env });
    res.status(200).json({ domain, report: result.report, trace: result.trace });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
