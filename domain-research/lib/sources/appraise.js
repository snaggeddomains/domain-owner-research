import { fetchJson, normalizeDomain, isValidDomain } from '../util.js';

const BASE = 'https://appraise.net/api/v1';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function headers(env) {
  return {
    'X-API-Key': env.APPRAISE_NET_KEY,
    'X-API-Secret': env.APPRAISE_NET_SECRET,
    'content-type': 'application/json',
  };
}

// Premium (paid) — Appraise.net AI valuation. Tries an existing/cached appraisal
// first (cheaper), then creates one; handles a sync result or an async job.
// Valuation is supporting context (marketability / holder type), not ownership.
export default {
  name: 'appraise_lookup',
  description:
    'Appraise.net domain valuation (premium). Returns an AI-powered appraisal (estimated value and rationale) ' +
    'for the domain. Use as supporting context on marketability and likely holder type (e.g. investor vs operator) ' +
    '— it does NOT establish ownership.',
  parameters: { type: 'object', properties: { domain: { type: 'string' } }, required: ['domain'] },
  requiresKey: ['APPRAISE_NET_KEY', 'APPRAISE_NET_SECRET'],
  async run({ domain }, { env }) {
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);
    const h = headers(env);

    // 1) Existing appraisal (cached / cheap).
    try {
      const existing = await fetchJson(`${BASE}/appraisal/${encodeURIComponent(d)}`, { headers: h });
      if (existing) return { domain: d, cached: true, appraisal: existing };
    } catch (e) {
      // 404 = none yet; fall through to create. Other errors also fall through.
    }

    // 2) Create a new appraisal (may be sync or an async job).
    const created = await fetchJson(`${BASE}/appraisal`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ domain: d }),
    });

    const looksDone = created && (created.estimated_value != null || created.value != null || created.appraisal || created.result);
    if (looksDone) return { domain: d, cached: false, appraisal: created.appraisal || created.result || created };

    const jobId = created && (created.job_id || created.jobId || created.id);
    if (jobId) {
      for (let i = 0; i < 8; i++) {
        await delay(2000);
        try {
          const st = await fetchJson(`${BASE}/appraisal/status/${encodeURIComponent(jobId)}`, { headers: h });
          const status = String((st && (st.status || st.state)) || '').toLowerCase();
          if (st && (st.result || st.appraisal) || /complete|done|success|finished/.test(status)) {
            return { domain: d, cached: false, job_id: jobId, appraisal: (st && (st.result || st.appraisal)) || st };
          }
          if (/fail|error|cancel/.test(status)) return { domain: d, job_id: jobId, error: `appraisal job ${status}` };
        } catch (e) {
          /* keep polling */
        }
      }
      return { domain: d, status: 'pending', job_id: jobId, note: 'Appraisal still processing — try again shortly.' };
    }

    return { domain: d, appraisal: created };
  },
};
