import { fetchJson, normalizeDomain, isValidDomain } from '../util.js';

const BASE = 'https://appraise.net/api/v1';

function headers(env) {
  return {
    'X-API-Key': env.APPRAISE_NET_KEY,
    'X-API-Secret': env.APPRAISE_NET_SECRET,
    'content-type': 'application/json',
  };
}

// The result lives under `valuation` (sync/cached) or `results[0].valuation`
// (completed async job). Dig it out.
const unwrap = (o) => {
  if (!o) return o;
  if (o.valuation) return o.valuation;
  if (Array.isArray(o.results) && o.results[0]) return o.results[0].valuation || o.results[0];
  return o.appraisal || o.result || o;
};
const hasResult = (o) =>
  o && (o.valuation || (Array.isArray(o.results) && o.results.length) || o.appraisal || o.result || o.value != null || o.estimated_value != null || o.estimatedValue || o.range);

// Appraise.net sometimes returns an ERROR as a 200-with-string body (e.g.
// "Database connection failed: SQLSTATE[HY000] [1040] Too many connections")
// or an error-shaped object. A real valuation is always an object with value
// content — so a bare string, or an error object with no valuation, is a failure
// we must surface (not render as an empty appraisal).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TRANSIENT = /too many connections|database connection failed|sqlstate|temporarily unavailable|try again|service unavailable|bad gateway|gateway time|timeout|throttle|rate limit|\b(429|502|503|504)\b/i;
function errString(o) {
  if (o == null) return null;
  if (typeof o === 'string') return o; // a valid valuation is never a bare string
  if (typeof o === 'object') {
    const msg = o.error || o.detail || o.message || o.errors;
    if (msg && !hasResult(o)) return typeof msg === 'string' ? msg : JSON.stringify(msg);
  }
  return null;
}
// fetchJson with: (a) detection of a 200-with-error body, (b) retry+backoff on
// any transient upstream failure (their DB overload is transient).
// Cloudflare "Just a moment…" / managed-challenge interstitial — Appraise.net
// occasionally challenges our datacenter IP even though we hold valid API
// credentials (their bot/under-attack protection misfiring on server traffic).
const isChallenge = (s) => /just a moment|cf-mitigated|challenge-platform|attention required|enable javascript and cookies|cloudflare/i.test(s);
async function fetchAppraise(url, opts) {
  let last = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const body = await fetchJson(url, opts);
      const err = errString(body);
      if (!err) return body;
      last = err;
      if ((TRANSIENT.test(err) || isChallenge(err)) && attempt < 3) { await sleep(800 * 2 ** attempt); continue; }
      if (isChallenge(err)) throw new Error('Appraise.net is temporarily blocking automated requests (Cloudflare challenge). This is on their end — our API access is valid. Please try again shortly.');
      throw new Error(`Appraise.net: ${err.slice(0, 160)}`);
    } catch (e) {
      const m = String((e && e.message) || e);
      if ((TRANSIENT.test(m) || isChallenge(m)) && attempt < 3) { last = m; await sleep(800 * 2 ** attempt); continue; }
      if (isChallenge(m)) throw new Error('Appraise.net is temporarily blocking automated requests (Cloudflare challenge). This is on their end — our API access is valid. Please try again shortly.');
      throw e;
    }
  }
  if (isChallenge(last)) throw new Error('Appraise.net is temporarily blocking automated requests (Cloudflare challenge). This is on their end — our API access is valid. Please try again shortly.');
  throw new Error(`Appraise.net unavailable: ${String(last).slice(0, 160)}`);
}

// Premium (paid) — Appraise.net AI valuation. Tries an existing/cached appraisal,
// else creates one; async jobs return a job_id that the caller polls (pass
// job_id back to fetch status). Valuation is supporting context, not ownership.
export default {
  name: 'appraise_lookup',
  description:
    'Appraise.net domain valuation (premium). Returns an AI appraisal: value range, confidence, type, certificate ' +
    'URL, and strengths/weaknesses. Supporting context on marketability and likely holder type — not ownership.',
  parameters: {
    type: 'object',
    properties: {
      domain: { type: 'string' },
      job_id: { type: 'string', description: 'Poll an in-progress appraisal job instead of starting a new one' },
      force: { type: 'boolean', description: 'Skip the existing/cached appraisal and create a fresh one (spends credits)' },
    },
  },
  requiresKey: ['APPRAISE_NET_KEY', 'APPRAISE_NET_SECRET'],
  async run({ domain, job_id, force }, { env }) {
    const h = headers(env);

    // Poll an in-progress job's status (raw — caller detects completion).
    if (job_id) {
      const st = await fetchAppraise(`${BASE}/appraisal/status/${encodeURIComponent(job_id)}`, { headers: h });
      return { job_id, ...st };
    }

    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);

    // Existing / cached appraisal first (cheaper) — unless the caller asked
    // for a forced fresh run (the UI's Refresh button passes force=1).
    const wantsForce = force === true || force === 'true' || force === 1 || force === '1';
    if (!wantsForce) {
      try {
        const existing = await fetchAppraise(`${BASE}/appraisal/${encodeURIComponent(d)}`, { headers: h });
        if (existing) return { domain: d, cached: true, appraisal: unwrap(existing) };
      } catch (e) {
        // A genuine "not found" means no cached appraisal yet → create one.
        // Any other failure (e.g. their DB outage) must SURFACE, not be silently
        // swallowed into a confusing empty result.
        if (!/404|not found/i.test(String((e && e.message) || e))) throw e;
      }
    }

    // Create a new appraisal — sync result or an async job to poll.
    const created = await fetchAppraise(`${BASE}/appraisal`, { method: 'POST', headers: h, body: JSON.stringify({ domain: d }) });
    if (hasResult(created)) return { domain: d, cached: false, appraisal: unwrap(created) };
    const jobId = created && (created.job_id || created.jobId || created.id);
    if (jobId) return { domain: d, status: 'pending', job_id: jobId };
    return { domain: d, appraisal: unwrap(created) };
  },
};

