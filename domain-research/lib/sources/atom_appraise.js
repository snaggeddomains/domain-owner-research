import { fetchJson, normalizeDomain, isValidDomain } from '../util.js';

// Atom.com (formerly Squadhelp) domain appraisal — a SECOND-OPINION valuation
// shown alongside Appraise.net in the Appraisal tool. Auth is query-param:
// api_token (= the account's appraisal_api_key) + user_id. The general api_key
// is NOT used by this endpoint.
//
// ⚠️ HARD DAILY CAP (~10/day on the current plan; see usage.daily_limit in the
// response). So this is `agentExcluded` (the autonomous research agent never sees
// it) and the UI caches the result per domain — it must NOT fire on every run.
const ENDPOINT = 'https://www.atom.com/api/marketplace/domain-appraisal';

export default {
  name: 'atom_appraise',
  description:
    'Atom.com domain appraisal (SECOND-OPINION valuation alongside Appraise.net). Returns Atom’s estimated value ' +
    '(USD), a 0–10 domain score, positive/negative signals, trademark-conflict count, registration date, and ' +
    'listing/BIN status. Supporting context on marketability — not ownership. NOTE: hard ~10/day cap; cached per domain.',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  requiresKey: ['ATOM_APPRAISAL_KEY', 'ATOM_USER_ID'],
  // Keep this off the autonomous agent's tool list so a research run can't exhaust
  // the small daily quota — only the Appraisal tool calls it (cache-first).
  agentExcluded: true,
  async run({ domain }, { env }) {
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);
    const url =
      `${ENDPOINT}?api_token=${encodeURIComponent(env.ATOM_APPRAISAL_KEY)}` +
      `&user_id=${encodeURIComponent(env.ATOM_USER_ID)}` +
      `&domain_name=${encodeURIComponent(d)}`;
    // The endpoint returns 200 with a {message:…} body on every error (bad token,
    // missing param, OR daily-limit exhausted). A real appraisal carries
    // `atom_appraisal`. Surface limit/auth errors clearly.
    const data = await fetchJson(url, {}, 30000);
    if (!data || data.atom_appraisal == null) {
      const msg = (data && data.message) || 'Atom returned no appraisal';
      if (/limit|quota|exceed/i.test(msg)) throw new Error(`Atom daily appraisal limit reached — ${msg}`);
      throw new Error(`Atom: ${msg}`);
    }
    const usage = data.usage || {};
    const used = usage.used_today;
    const cap = usage.daily_limit;
    return {
      domain: data.domain_name || d,
      provider: 'atom',
      value: Number(data.atom_appraisal) || null,
      currency: 'USD',
      score: data.domain_score ?? null,               // 0–10
      positive_signals: Array.isArray(data.positive_signals) ? data.positive_signals : [],
      negative_signals: Array.isArray(data.negative_signals) ? data.negative_signals : [],
      tld_taken_count: data.tld_taken_count ?? null,
      tm_conflicts: data.tm_conflicts ?? null,
      date_registered: data.date_registered || null,
      is_listed: Boolean(data.is_listed),
      bin_price: data.bin_price ?? null,
      usage: {
        used_today: used ?? null,
        daily_limit: cap ?? null,
        remaining: (cap != null && used != null) ? Math.max(0, cap - used) : null,
      },
    };
  },
};
