import { fetchJson, normalizeDomain } from '../util.js';
import whois from './whois.js';
import readurl from './readurl.js';

// Deterministic "who is behind this brand" battery. Instead of relying on the
// model to invent good queries one at a time, this ALWAYS runs the full thread
// in one call: WHOIS the portfolio domain (strongest unmask), fire a fixed set
// of identity searches on Brave, and READ the top non-marketplace pages — then
// hand back the raw material so the model can name the operator and verify via
// whoxy_reverse. Built from the human playbook (brand → Quora/LinkedIn → name).
const BRAVE = 'https://api.search.brave.com/res/v1/web/search';
const MAJOR =
  /(?:^|\.)(?:afternic|atom|squadhelp|sedo|dan|godaddy|namecheap|hugedomains|buydomains|wikipedia|who\.is|whatsmydns|icann|lookup\.icann|domain\.com|webhostingtalk)\.[a-z.]+/i;

async function brave(q, env) {
  try {
    const d = await fetchJson(`${BRAVE}?q=${encodeURIComponent(q)}&count=8`, {
      headers: { 'X-Subscription-Token': env.BRAVE_SEARCH_KEY, accept: 'application/json' },
    });
    const web = d && d.web && Array.isArray(d.web.results) ? d.web.results : [];
    return web.map((r) => ({ title: r.title, url: r.url, description: r.description }));
  } catch {
    return [];
  }
}

export default {
  name: 'identify_operator',
  description:
    'Deterministic identity battery for unmasking the person behind a portfolio/brand. Given the brand name (and ' +
    'optionally its domain), it WHOIS-es the portfolio domain, runs a fixed set of identity searches (owner/founder, ' +
    'Quora, LinkedIn, NamePros, interview), and READS the top non-marketplace pages — returning the WHOIS registrant, ' +
    'merged search hits, and page text. Use this (instead of ad-hoc searching) when a private domain traces to a ' +
    "seller/portfolio brand whose operator you need to name; then verify the candidate via whoxy_reverse.",
  parameters: {
    type: 'object',
    properties: {
      brand: { type: 'string', description: 'Portfolio/brand name, e.g. "DomainMan" or "domainman.com"' },
      domain: { type: 'string', description: 'The portfolio brand domain to WHOIS, e.g. domainman.com' },
    },
    required: ['brand'],
  },
  requiresKey: ['BRAVE_SEARCH_KEY'],
  async run({ brand, domain }, { env }) {
    const b = String(brand || '').trim();
    if (!b) throw new Error('Provide a brand/portfolio name');
    const queries = [
      `"${b}" owner`,
      `"${b}" founder`,
      `${b} site:quora.com`,
      `${b} site:linkedin.com`,
      `${b} site:namepros.com`,
      `${b} domain investor interview`,
    ];
    if (domain) queries.push(`"${domain}" owner`);

    const batches = await Promise.all(queries.map((q) => brave(q, env)));
    const seen = new Set();
    const results = [];
    for (const arr of batches) {
      for (const r of arr) {
        if (r.url && !seen.has(r.url)) {
          seen.add(r.url);
          results.push(r);
        }
      }
    }

    // WHOIS the portfolio domain itself — often the most direct unmask.
    let portfolio_whois = null;
    if (domain) {
      try {
        portfolio_whois = await whois.run({ domain: normalizeDomain(domain) }, { env });
      } catch (e) {
        portfolio_whois = { error: String(e?.message || e) };
      }
    }

    // Read the most promising identity pages (Quora/LinkedIn/NamePros/about/non-marketplace).
    const targets = results
      .filter((r) => /quora\.com|linkedin\.com|namepros\.com|\babout\b|interview/i.test(`${r.url} ${r.title}`) || !MAJOR.test(r.url))
      .slice(0, 4);
    const pages = [];
    for (const t of targets) {
      try {
        const p = await readurl.run({ url: t.url });
        pages.push({ url: p.url, title: p.title, text: String(p.text || '').slice(0, 2500) });
      } catch {
        /* skip unreadable */
      }
    }

    return { brand: b, portfolio_whois, search_results: results.slice(0, 25), pages };
  },
};
