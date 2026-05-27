import dns from './dns.js';
import rdap from './rdap.js';
import whois from './whois.js';
import wayback from './wayback.js';
import whoisxml from './whoisxml.js';
import domainiq from './domainiq.js';
import bigdomaindata from './bigdomaindata.js';
import masterlist from './masterlist.js';
import livesite from './livesite.js';
import rocketreach from './rocketreach.js';
import rocketreachLookup from './rocketreachlookup.js';
import marketplace from './marketplace.js';
import reversewhois from './reversewhois.js';
import reversens from './reversens.js';
import reverseip from './reverseip.js';
import websearch from './websearch.js';
import cluster from './cluster.js';
import trademark from './trademark.js';
import appraise from './appraise.js';

// To add a new data source: create a module exporting { name, description,
// parameters, requiresKey?, run(args, { env }) } and register it here.
const ALL = [
  rdap, whois, dns, wayback, livesite, marketplace, cluster, masterlist, rocketreach,
  whoisxml, domainiq, bigdomaindata, reversewhois, reversens, reverseip, websearch, trademark, appraise,
  rocketreachLookup,
];

// Paid sources spend external API credits. They are withheld from the free
// pre-flight pass (tier 'free') and only exposed on a deliberate "go deeper"
// pass (tier 'all').
const PAID = new Set([
  'whoisxml_lookup', 'domainiq_lookup', 'bigdomaindata_lookup',
  'reverse_whois', 'reverse_ns', 'reverse_ip', 'web_search', 'trademark_search', 'appraise_lookup',
  'rocketreach_lookup',
]);

// Recap grouping — each source's category, used to break the "Sources checked"
// panel into labeled sections.
const CATEGORY = {
  rdap_whois: 'Current registration',
  whois_lookup: 'Current registration',
  dns_lookup: 'Infrastructure (DNS)',
  whoisxml_lookup: 'Ownership history',
  domainiq_lookup: 'Ownership history',
  bigdomaindata_lookup: 'Ownership history',
  reverse_whois: 'Portfolio & shared infra',
  reverse_ns: 'Portfolio & shared infra',
  reverse_ip: 'Portfolio & shared infra',
  wayback_history: 'Archive (Wayback)',
  livesite_inspect: 'Live site',
  registration_cluster: 'Registration cluster',
  marketplace_check: 'Marketplace',
  masterlist_lookup: 'Internal list',
  rocketreach_search: 'People & contacts',
  rocketreach_lookup: 'People & contacts',
  web_search: 'Web & social',
  trademark_search: 'Trademark / legal',
  appraise_lookup: 'Valuation',
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
  return ALL.filter((s) => isEnabled(s, env) && (tier === 'all' || !PAID.has(s.name))).map((s) => ({
    name: s.name,
    description: s.description,
    parameters: s.parameters,
  }));
}

export async function runTool(name, args, env) {
  const source = ALL.find((s) => s.name === name);
  if (!source) return { ok: false, error: `Unknown tool: ${name}` };
  if (!isEnabled(source, env)) return { ok: false, error: `Tool ${name} is not configured on the server` };
  try {
    const data = await source.run(args || {}, { env });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
