import { fetchJson } from '../util.js';

const ENDPOINT = 'https://api.signa.so/v1/trademarks';

// Premium (paid) — Signa.so trademark search. A mark on the brand names the
// legal owner; even pending/abandoned applications name an applicant (a clue),
// and a filing date near the domain's creation corroborates ownership.
export default {
  name: 'trademark_search',
  description:
    'Signa.so trademark SCREENING (premium, USPTO). Query is the brand/SLD (percent.ai -> "percent"). Returns ' +
    'matching marks: text, applicant/owner, status (live / pending / abandoned / dead), Nice classes, serial/reg ' +
    'numbers, goods/services. Screening-level risk read, NOT legal clearance. Flag active EXACT marks; for .ai ' +
    'domains weight Classes 9 & 42 (software/AI/tech) heavily; note live-company / common-law collisions. Bucket ' +
    'the overall read Green / Yellow / Red.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Brand keyword (the domain SLD) or owner name to search' },
      office: { type: 'string', description: 'Trademark office; default "uspto"' },
    },
    required: ['query'],
  },
  requiresKey: ['SIGNA_TM_API_KEY'],
  async run({ query, office }, { env }) {
    const q = String(query || '').trim();
    if (!q) throw new Error('Provide a brand keyword or name in "query"');
    const data = await fetchJson(ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.SIGNA_TM_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        query: q,
        filters: { offices: [office ? String(office).toLowerCase() : 'uspto'] },
        strategies: ['exact', 'phonetic', 'fuzzy', 'prefix'],
        limit: 20,
      }),
    });

    const items = Array.isArray(data)
      ? data
      : (data && (data.results || data.data || data.trademarks || data.hits)) || [];
    const list = Array.isArray(items) ? items.slice(0, 20) : [];
    const out = { query: q, count: list.length, trademarks: list };
    // If the result shape isn't what we guessed, surface a raw sample so we can
    // see the response and adjust parsing.
    if (!list.length && data && typeof data === 'object') out.raw = JSON.stringify(data).slice(0, 2000);
    return out;
  },
};
