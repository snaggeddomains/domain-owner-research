import dns from './dns.js';
import rdap from './rdap.js';
import whois from './whois.js';
import wayback from './wayback.js';
import whoisxml from './whoisxml.js';
import domainiq from './domainiq.js';
import bigdomaindata from './bigdomaindata.js';
import masterlist from './masterlist.js';
import universeOwnership from './universe_ownership.js';
import livesite from './livesite.js';
import rocketreach from './rocketreach.js';
import rocketreachLookup from './rocketreachlookup.js';
import fullenrich from './fullenrich.js';
import whoxyHistory from './whoxyhistory.js';
import whoxyReverse from './whoxyreverse.js';
import readurl from './readurl.js';
import bravesearch from './bravesearch.js';
import analytics from './analytics.js';
import identify from './identify.js';
import marketplace from './marketplace.js';
import reversewhois from './reversewhois.js';
import reversens from './reversens.js';
import reverseip from './reverseip.js';
import websearch from './websearch.js';
import cluster from './cluster.js';
import trademark from './trademark.js';
import appraise from './appraise.js';
import namebio from './namebio.js';
import namepros from './namepros.js';
import { recordUsage } from '../db/usage.js';

// To add a new data source: create a module exporting { name, description,
// parameters, requiresKey?, run(args, { env }) } and register it here.
const ALL = [
  rdap, whois, dns, wayback, livesite, marketplace, cluster, masterlist, universeOwnership, rocketreach, readurl, analytics,
  whoisxml, domainiq, bigdomaindata, reversewhois, reversens, reverseip, websearch, bravesearch, trademark, appraise,
  rocketreachLookup, fullenrich, whoxyHistory, whoxyReverse, identify, namebio, namepros,
];

// Paid sources spend external API credits. They are withheld from the free
// pre-flight pass (tier 'free') and only exposed on a deliberate "go deeper"
// pass (tier 'all').
const PAID = new Set([
  'whoisxml_lookup', 'domainiq_lookup', 'bigdomaindata_lookup',
  'reverse_whois', 'reverse_ns', 'reverse_ip', 'web_search', 'brave_search', 'trademark_search', 'appraise_lookup',
  'rocketreach_lookup', 'fullenrich_lookup', 'whoxy_history', 'whoxy_reverse', 'identify_operator', 'namebio_sales',
  'namepros_search',
]);

// Paid sources we nonetheless run on the FREE pre-flight pass (still cost-metered
// via PAID, just not deep-only). DomainIQ's historical-WHOIS is valuable enough on
// the first pass to justify the per-search credit.
const FREE_PAID = new Set(['domainiq_lookup']);

// Recap grouping — each source's category, used to break the "Sources checked"
// panel into labeled sections.
const CATEGORY = {
  rdap_whois: 'Current registration',
  whois_lookup: 'Current registration',
  dns_lookup: 'Infrastructure (DNS)',
  whoisxml_lookup: 'Ownership history',
  domainiq_lookup: 'Ownership history',
  bigdomaindata_lookup: 'Ownership history',
  whoxy_history: 'Ownership history',
  reverse_whois: 'Portfolio & shared infra',
  whoxy_reverse: 'Portfolio & shared infra',
  reverse_ns: 'Portfolio & shared infra',
  reverse_ip: 'Portfolio & shared infra',
  wayback_history: 'Archive (Wayback)',
  livesite_inspect: 'Live site',
  analytics_footprint: 'Live site',
  registration_cluster: 'Registration cluster',
  marketplace_check: 'Marketplace',
  masterlist_lookup: 'Internal list',
  universe_ownership: 'Internal list',
  rocketreach_search: 'People & contacts',
  rocketreach_lookup: 'People & contacts',
  fullenrich_lookup: 'People & contacts',
  web_search: 'Web & social',
  brave_search: 'Web & social',
  read_url: 'Web & social',
  identify_operator: 'Web & social',
  namepros_search: 'Web & social',
  trademark_search: 'Trademark / legal',
  appraise_lookup: 'Valuation',
  namebio_sales: 'Sales history',
};

export function getCategoryMap() {
  return CATEGORY;
}

function isEnabled(source, env) {
  if (!source.requiresKey) return true;
  // A requiresKey entry may be a single var name, or an array of acceptable
  // alternatives (satisfied when ANY of them is set).
  return source.requiresKey.every((k) =>
    Array.isArray(k) ? k.some((alt) => Boolean(env[alt])) : Boolean(env[k]),
  );
}

// Only expose tools whose keys are configured (and that fit the requested cost
// tier), so the model never calls a source it can't use or shouldn't yet.
// Returns a provider-neutral spec; each LLM adapter converts it to that
// provider's tool format.
export function getToolSpecs(env, { tier = 'all' } = {}) {
  return ALL.filter((s) => isEnabled(s, env) && (tier === 'all' || !PAID.has(s.name) || FREE_PAID.has(s.name))).map((s) => ({
    name: s.name,
    description: s.description,
    parameters: s.parameters,
  }));
}

// Map a successful paid-tool result to one or more cost meters + units (the
// natural billing unit — 1 per call/lookup, plus the FullEnrich phone count).
// Free sources and misses are skipped. Powers the Reports → Cost tab.
function usageMeters(name, data) {
  switch (name) {
    case 'fullenrich_lookup': {
      const out = [['fullenrich.enrich', 1]];
      const phones = (data && data.phones) || [];
      if (phones.length) out.push(['fullenrich.phone', phones.length]);
      return out;
    }
    case 'rocketreach_lookup': return [['rocketreach.lookup', 1]];
    case 'domainiq_lookup': return [['domainiq.lookup', 1]];
    case 'whoisxml_lookup': return [['whoisxml.lookup', 1]];
    case 'bigdomaindata_lookup': return [['bigdomaindata.lookup', 1]];
    case 'reverse_whois': return [['whoisxml.reverse_whois', 1]];
    case 'reverse_ns': return [['whoisxml.reverse_ns', 1]];
    case 'reverse_ip': return [['whoisxml.reverse_ip', 1]];
    case 'whoxy_history': return [['whoxy.history', 1]];
    case 'whoxy_reverse': return [['whoxy.reverse', 1]];
    case 'web_search': return [['serper.web_search', 1]];
    case 'namepros_search': return [['serper.namepros', 1]];
    case 'brave_search': return [['brave.search', 1]];
    case 'trademark_search': return [['signa.trademark', 1]];
    case 'namebio_sales': return [['namebio.sales', 1]];
    case 'appraise_lookup':
      // 3 credits new / 1 cached; only count when an appraisal actually returns
      // (skip the async "pending" submit-poll churn).
      if (data && data.appraisal) return [[data.cached ? 'appraise.cached' : 'appraise.new', 1]];
      return [];
    default: return [];
  }
}

export async function runTool(name, args, env) {
  const source = ALL.find((s) => s.name === name);
  if (!source) return { ok: false, error: `Unknown tool: ${name}` };
  if (!isEnabled(source, env)) return { ok: false, error: `Tool ${name} is not configured on the server` };
  try {
    const data = await source.run(args || {}, { env });
    if (PAID.has(name)) {
      for (const [meter, units] of usageMeters(name, data)) {
        recordUsage(meter, units, { run_id: args && args.__run_id, meta: { tool: name } });
      }
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
