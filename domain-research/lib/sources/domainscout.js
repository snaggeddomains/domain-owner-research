import { normalizeDomain, isValidDomain } from '../util.js';
import { lookupDomain } from '../domainscout.js';

// Free (flat-rate Hunter subscription, no per-call credit) — DomainScout's
// authoritative per-marketplace for-sale check. One call returns the listing
// state (listed / price / currency / link) across every marketplace DomainScout
// monitors (Afternic, Sedo, GoDaddy, Namecheap, Sav, Spaceship, Atom, Dan/Efty,
// HugeDomains, …), which is broader and more reliable than scraping each page.
// If the domain isn't tracked yet, it's added to the watchlist then re-read.
export default {
  name: 'domainscout_lookup',
  description:
    'DomainScout marketplace check (authoritative). Given a domain, returns whether it is listed for sale on each ' +
    'marketplace DomainScout monitors (Afternic, Sedo, GoDaddy, Namecheap, Sav, Spaceship, Atom, Dan, Efty, ' +
    'HugeDomains, and more) with price + currency. A listing usually exposes the seller/broker and an asking price. ' +
    'Replaces the best-effort page-scraping marketplace_check when a DomainScout key is configured.',
  parameters: {
    type: 'object',
    properties: {
      domain: { type: 'string' },
      track: { type: 'boolean', description: 'Add the domain to monitoring if not already tracked (default true)' },
    },
    required: ['domain'],
  },
  requiresKey: [['DOMAINSCOUT_KEY', 'DOMAINSCOUT_API_KEY']],
  async run({ domain, track }, ctx = {}) {
    const env = ctx.env || process.env || {};
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);
    return lookupDomain(d, env, { track: track !== false });
  },
};
