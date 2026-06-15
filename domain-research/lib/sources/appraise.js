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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const asText = (o) => (typeof o === 'string' ? o : JSON.stringify(o || ''));

// Appraise.net is ASYNC: POST /appraisal now returns a job acknowledgement, e.g.
// {message:"Appraisal job created. Poll /api/v1/appraisal/status/job_abc for updates."}
// — the job id is embedded IN THE MESSAGE TEXT, not a structured field. Pull it
// from either a field or the text.
const JOB_RE = /\bjob_[a-z0-9]+/i;
function jobIdFrom(o) {
  if (o == null) return null;
  if (typeof o === 'object') {
    const direct = o.job_id || o.jobId || o.id;
    if (direct) return String(direct);
  }
  const m = asText(o).match(JOB_RE);
  return m ? m[0] : null;
}
const isJobAck = (o) => JOB_RE.test(asText(o)) || /job created|poll\b[^]*\bstatus|status\/job|for updates/i.test(asText(o));
const PENDING_RE = /\b(pending|processing|queued|in[_\s-]?progress|running|started|working)\b/i;
const isPending = (o) => {
  if (!o || typeof o !== 'object') return false;
  return PENDING_RE.test(String(o.status || o.state || o.job_status || '').toLowerCase());
};

// Appraise.net sometimes returns an ERROR as a 200-with-string body (e.g.
// "Database connection failed: SQLSTATE[HY000] [1040] Too many connections")
// or an error-shaped object. A real valuation is always an object with value
// content. We must surface genuine failures, but NOT mistake an async job
// acknowledgement / in-progress status poll for an error (that was the bug that
// rendered "Appraise.net: Appraisal job created. Poll …" as a failure).
const TRANSIENT = /too many connections|database connection failed|sqlstate|temporarily unavailable|try again|service unavailable|bad gateway|gateway time|timeout|throttle|rate limit|\b(429|502|503|504)\b/i;
function errString(o) {
  if (o == null) return null;
  const text = asText(o);
  // Real upstream outage / bot-challenge — always a (retryable) error.
  if (TRANSIENT.test(text) || isChallenge(text)) {
    if (typeof o === 'string') return o;
    const msg = o.error || o.errors || o.detail || o.message;
    return msg ? (typeof msg === 'string' ? msg : JSON.stringify(msg)) : text.slice(0, 160);
  }
  // Async job ack, an in-progress status poll, or a real result → NOT an error.
  if (isJobAck(o) || isPending(o) || hasResult(o)) return null;
  // A bare string is never a valid valuation (e.g. an error dump).
  if (typeof o === 'string') return o;
  // Explicit error-shaped object (error/errors field, no result).
  if (typeof o === 'object') {
    const msg = o.error || o.errors;
    if (msg) return typeof msg === 'string' ? msg : JSON.stringify(msg);
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

// Poll an async appraisal job to completion within a time budget (we run under a
// 60s function ceiling, so leave headroom). Returns the finished appraisal, or
// null if it's still pending when the budget runs out — in which case the caller
// hands the job_id back to the client, whose own poll loop takes over. Best-effort:
// a transient blip just retries within the budget rather than failing the request.
async function pollJob(domain, jobId, h, budgetMs = 45000) {
  const start = Date.now();
  let delay = 1500;
  while (Date.now() - start < budgetMs) {
    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.4), 6000);
    let st;
    try {
      st = await fetchAppraise(`${BASE}/appraisal/status/${encodeURIComponent(jobId)}`, { headers: h });
    } catch {
      continue; // transient/blip — keep trying until the budget is spent
    }
    if (hasResult(st)) return { domain: domain || st.domain, cached: false, job_id: jobId, appraisal: unwrap(st) };
    const state = String((st && (st.status || st.state || st.job_status)) || '').toLowerCase();
    if (/fail|error|cancel/.test(state)) return null; // surface as pending → client shows status
  }
  return null;
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

    // Poll an in-progress job's status. Return the finished appraisal when ready,
    // else the raw status so the client's poll loop keeps going.
    if (job_id) {
      const st = await fetchAppraise(`${BASE}/appraisal/status/${encodeURIComponent(job_id)}`, { headers: h });
      if (hasResult(st)) return { domain: st.domain || undefined, cached: false, job_id, appraisal: unwrap(st) };
      return { job_id, status: String(st && (st.status || st.state) || 'pending'), ...st };
    }

    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);

    // Existing / cached appraisal first (cheaper) — unless the caller asked
    // for a forced fresh run (the UI's Refresh button passes force=1).
    const wantsForce = force === true || force === 'true' || force === 1 || force === '1';
    if (!wantsForce) {
      try {
        const existing = await fetchAppraise(`${BASE}/appraisal/${encodeURIComponent(d)}`, { headers: h });
        if (hasResult(existing)) return { domain: d, cached: true, appraisal: unwrap(existing) };
        // A cached lookup that itself returns a job → poll it to completion.
        const ej = jobIdFrom(existing);
        if (ej) return (await pollJob(d, ej, h)) || { domain: d, status: 'pending', job_id: ej };
        if (existing) return { domain: d, cached: true, appraisal: unwrap(existing) };
      } catch (e) {
        // Fall through to CREATE when there's no viewable cached appraisal:
        //   • 404 / not found  → none exists yet
        //   • 403 "Access denied. Purchase this appraisal to view details."
        //     → one exists but is locked; Appraise.net's own response tells us to
        //       POST /api/v1/appraisal (cost 1) to get a fresh, viewable result.
        // Any OTHER failure (e.g. their DB outage) must SURFACE, not be swallowed
        // into a confusing empty result.
        const m = String((e && e.message) || e);
        if (!/404|not found|403|access denied|purchase this appraisal/i.test(m)) throw e;
      }
    }

    // Create a new appraisal — sync result, or an async job we poll to completion
    // (Appraise.net is async now: the POST acks a job whose id is embedded in the
    // message text). If it doesn't finish within our budget, hand the job_id to the
    // client, whose poll loop continues from there.
    const created = await fetchAppraise(`${BASE}/appraisal`, { method: 'POST', headers: h, body: JSON.stringify({ domain: d }) });
    if (hasResult(created)) return { domain: d, cached: false, appraisal: unwrap(created) };
    const jobId = jobIdFrom(created);
    if (jobId) return (await pollJob(d, jobId, h)) || { domain: d, status: 'pending', job_id: jobId };
    return { domain: d, appraisal: unwrap(created) };
  },
};

