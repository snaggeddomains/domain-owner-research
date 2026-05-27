import { fetchJson, normalizeDomain, isValidDomain } from '../util.js';

const BASE = 'https://appraise.net/api/v1';

function headers(env) {
  return {
    'X-API-Key': env.APPRAISE_NET_KEY,
    'X-API-Secret': env.APPRAISE_NET_SECRET,
    'content-type': 'application/json',
  };
}

const hasResult = (o) =>
  o && (o.appraisal || o.result || o.value != null || o.estimated_value != null || o.value_range || o.range || o.low_value != null);

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
    },
  },
  requiresKey: ['APPRAISE_NET_KEY', 'APPRAISE_NET_SECRET'],
  async run({ domain, job_id }, { env }) {
    const h = headers(env);

    // Poll an in-progress job's status (raw — caller detects completion).
    if (job_id) {
      const st = await fetchJson(`${BASE}/appraisal/status/${encodeURIComponent(job_id)}`, { headers: h });
      return { job_id, ...st };
    }

    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);

    // Existing / cached appraisal first (cheaper).
    try {
      const existing = await fetchJson(`${BASE}/appraisal/${encodeURIComponent(d)}`, { headers: h });
      if (existing) return { domain: d, cached: true, appraisal: existing.appraisal || existing.result || existing };
    } catch (e) {
      /* 404 = none yet; fall through to create */
    }

    // Create a new appraisal — sync result or an async job to poll.
    const created = await fetchJson(`${BASE}/appraisal`, { method: 'POST', headers: h, body: JSON.stringify({ domain: d }) });
    if (hasResult(created)) return { domain: d, cached: false, appraisal: created.appraisal || created.result || created };
    const jobId = created && (created.job_id || created.jobId || created.id);
    if (jobId) return { domain: d, status: 'pending', job_id: jobId };
    return { domain: d, appraisal: created };
  },
};

