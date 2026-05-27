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
    const dom = domain ? normalizeDomain(domain) : '';
    // Query the QUOTED full domain — far more precise than a bare brand like
    // "DomainMan" (which matches generic "domain map" noise).
    const term = dom ? `"${dom}"` : `"${b}"`;
    const queries = [
      term,
      `${term} owner`,
      `${term} founder`,
      `${term} domain investor`,
      `${term} site:quora.com`,
      `${term} site:linkedin.com`,
      `${term} site:namepros.com`,
    ];

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

    // WHOIS the portfolio domain itself — often the most direct unmask (though
    // GoDaddy's port-43 WHOIS is retired/rate-limited and many are privacy-shielded).
    let portfolio_whois = null;
    if (dom) {
      try {
        portfolio_whois = await whois.run({ domain: dom }, { env });
      } catch (e) {
        portfolio_whois = { error: String(e?.message || e) };
      }
    }

    // Read THIRD-PARTY identity pages only. Skip the portfolio's own domain
    // (its listing pages are marketplace templates that never name the seller)
    // and the major marketplaces; prioritise forums/Q&A/profiles/interviews that
    // might actually name the operator (NamePros reads fine; Quora/LinkedIn are
    // often JS-walled, flagged blocked:true — then rely on the snippet).
    const dHost = dom ? dom.replace(/^www\./, '') : '';
    const IDENTITY = /namepros\.com|quora\.com|linkedin\.com|crunchbase\.com|twitter\.com|x\.com|\babout\b|interview|founder|owner|profile/i;
    const candidates = results.filter((r) => {
      const host = (() => { try { return new URL(r.url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
      return host && host !== dHost && !MAJOR.test(r.url);
    });
    const ranked = [
      ...candidates.filter((r) => IDENTITY.test(`${r.url} ${r.title}`)),
      ...candidates.filter((r) => !IDENTITY.test(`${r.url} ${r.title}`)),
    ].slice(0, 10);
    const pages = [];
    for (const t of ranked) {
      if (pages.filter((p) => !p.blocked).length >= 4) break;
      try {
        const p = await readurl.run({ url: t.url }, { env });
        pages.push({ url: p.url, title: p.title, blocked: !!p.blocked, rendered: !!p.rendered, text: String(p.text || '').slice(0, 2500) });
      } catch {
        /* skip unreadable */
      }
    }

    return { brand: b, domain: dom || undefined, portfolio_whois, search_results: results.slice(0, 25), pages };
  },
};
