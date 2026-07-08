// Auto owner-crack triangulation — the "find a sibling with public contact info
// and confirm it's the same owner via a matching DNS/WHOIS fingerprint" move,
// automated. This is the technique Sam ran by hand: from a privacy-walled core
// domain, enumerate its ccTLD / affix / brand siblings (golfmax.com → golfmax.ca;
// unconvlabs.com → unconv.ai), read each sibling's PUBLIC WHOIS/RDAP registrant,
// and when a sibling shares the core's nameserver/registrant fingerprint, treat
// its named registrant as the core's likely owner.
//
// It composes existing engines — nothing new spent:
//   • discoverUpgrade (lib/sales/discovery/upgrade.js) — ccTLD/affix/brand-match
//     sibling enumeration + live active/for-sale/inactive status (incl. the
//     Clearbit brand-name pivot that turns "unconvlabs" → the real company site).
//   • freeOwnerLookup (lib/nameserver/owner.js) — free whois+rdap registrant merge.
//   • liveNameservers + classifyPair (lib/nameserver/*) — the DNS fingerprint.
//
// Deterministic scoring is the core (works with zero API keys); an optional LLM
// synthesis picks the single most-likely owner + evidence chain on top.
import { discoverUpgrade, seedParts } from '../sales/discovery/upgrade.js';
import { freeOwnerLookup } from '../nameserver/owner.js';
import { liveNameservers } from '../nameserver/query.js';
import { classifyPair } from '../nameserver/context.js';

const SIBLING_CAP = 14;        // how many siblings to actually WHOIS/NS-probe (free but polite)
const NS_CONCURRENCY = 6;

// ccTLDs whose registries publish USEFUL public WHOIS/RDAP registrant data —
// exactly where a privacy-walled .com's owner leaks (golfmax.com hidden, golfmax.ca
// → NGCOA in the clear). discoverUpgrade deliberately enumerates only brandable
// gTLDs, so owner-cracking adds the country-code variants directly.
const OWNER_CCTLDS = ['ca', 'us', 'uk', 'co.uk', 'com.au', 'au', 'de', 'eu', 'fr', 'nl', 'se', 'ch', 'nz', 'ie'];

// Company-suffix tokens that get bolted onto a brand's domain when the bare brand
// is taken — "unconvlabs.com" is the corp, but the product lives on "unconv.ai".
// Stripping the suffix recovers the brand ROOT so we can find the real company
// site (unconv.ai) the way Sam did by searching "Unconv labs" → "Unconv".
const BRAND_SUFFIXES = ['labs', 'lab', 'hq', 'app', 'studio', 'tech', 'group', 'digital', 'media', 'software', 'io', 'ai', 'inc', 'online', 'world', 'global', 'ventures', 'works', 'hub', 'co'];
// TLDs to try on the recovered brand root.
const BRAND_ROOT_TLDS = ['com', 'ai', 'io', 'co', 'app', 'net'];

// Recover candidate brand roots from an SLD by stripping a trailing company suffix
// (only when the remaining root is a real word-length ≥3). Returns [] when nothing
// strips (the SLD is already the root).
function brandRoots(sld) {
  const s = String(sld || '').toLowerCase();
  const roots = new Set();
  for (const suf of BRAND_SUFFIXES) {
    if (s.length > suf.length + 2 && s.endsWith(suf)) roots.add(s.slice(0, s.length - suf.length));
  }
  roots.delete(s);
  return [...roots];
}

// Bounded-concurrency map (small local copy so this module has no extra deps).
async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

// Is this a real, usable registrant (a named person/org) — not a privacy proxy or
// a bare registrar/marketplace tag? Those are channels, not owners.
const JUNK_REGISTRANT = /privacy|redacted|withheld|whois\s*guard|whoisguard|domains?\s*by\s*proxy|proxy|protect|godaddy|namecheap|dynadot|spaceship|porkbun|name\.com|network\s*solutions|registrar|contact\s*privacy|data\s*protected|not\s*disclosed|statutory\s*masking/i;
function usableRegistrant(o) {
  const name = (o && (o.organization || o.name)) || '';
  if (!name) return false;
  if (JUNK_REGISTRANT.test(name)) return false;
  return true;
}

// Does the registrant string read as an organization (so we don't label NGCOA a
// "person" just because the registry stuffed it in the name field)?
const ORG_HINT = /\b(inc|llc|ltd|corp|corporation|company|co|group|association|assoc|foundation|holdings?|partners?|ventures?|labs?|technologies|systems|solutions|media|studio|agency|society|club|trust|gmbh|s\.?a\.?|b\.?v\.?|pty|plc)\b|&/i;
function inferOwnerType(registrant) {
  if (registrant && registrant.organization) return 'organization';
  const name = (registrant && registrant.name) || '';
  return ORG_HINT.test(name) ? 'organization' : 'person';
}

// Compare two nameserver sets → a fingerprint verdict. Generic parking/registrar
// DNS is NOT a signal (classifyPair.generic), so a match on those is discarded.
export function fingerprintMatch(coreNs, sibNs) {
  const norm = (a) => [...new Set((a || []).map((n) => String(n || '').toLowerCase().trim()).filter(Boolean))].sort();
  const c = norm(coreNs);
  const s = norm(sibNs);
  if (!c.length || !s.length) return { match: 'none', strength: 0, shared: [], note: 'missing NS' };
  const coreClass = classifyPair(c);
  const sibClass = classifyPair(s);
  if (coreClass.generic || sibClass.generic) {
    return { match: 'none', strength: 0, shared: [], note: `generic DNS (${coreClass.provider || sibClass.provider}) — not an ownership signal` };
  }
  const shared = c.filter((n) => s.includes(n));
  const exact = c.length === s.length && shared.length === c.length;
  if (exact && coreClass.accountUnique) {
    return { match: 'exact', strength: 3, shared, note: `identical account-unique nameserver pair (${coreClass.kind}) — same owner` };
  }
  if (exact) {
    return { match: 'exact', strength: 2, shared, note: 'identical custom nameservers — very likely the same operator' };
  }
  if (shared.length) {
    return { match: 'overlap', strength: 1, shared, note: `shares custom nameserver(s): ${shared.join(', ')}` };
  }
  return { match: 'none', strength: 0, shared: [], note: 'different nameservers' };
}

// Build the sibling candidate set: enumerated ccTLD/affix/brand variants (with
// live status) UNION any related domains already surfaced by the report, minus
// the core itself. De-duped by domain.
async function gatherSiblings(domain, relatedDomains) {
  const { domain: self, sld } = seedParts(domain);
  const byDomain = new Map();
  // Report-provided related domains first (they're already vetted as related).
  for (const d of (relatedDomains || [])) {
    const dom = String(d || '').trim().toLowerCase();
    if (!dom || dom === self) continue;
    byDomain.set(dom, { domain: dom, company: null, subtype: 'report_related', status: null });
  }
  // Country-code variants of the exact SLD — the public-WHOIS leak path. Added
  // with status:null (never HTTP-classified away) so a registered-but-parked
  // ccTLD still gets its registrant read.
  for (const cc of OWNER_CCTLDS) {
    const dom = `${sld}.${cc}`;
    if (dom === self || byDomain.has(dom)) continue;
    byDomain.set(dom, { domain: dom, company: null, subtype: 'cctld_variant', status: null });
  }
  // Brand-root variants — strip a company suffix ("unconvlabs" → "unconv") and try
  // the root on the brandable TLDs to surface the real company site (unconv.ai).
  for (const root of brandRoots(sld)) {
    for (const t of BRAND_ROOT_TLDS) {
      const dom = `${root}.${t}`;
      if (dom === self || byDomain.has(dom)) continue;
      byDomain.set(dom, { domain: dom, company: null, subtype: 'brand_root', status: null });
    }
  }
  // Enumerated upgrade siblings (ccTLD/affix/brand-match) with live status.
  let upgrades = [];
  try { upgrades = await discoverUpgrade(domain, { classifyStatus: true, concurrency: 8 }); }
  catch { upgrades = []; }
  for (const u of upgrades) {
    const dom = String(u.domain || '').trim().toLowerCase();
    if (!dom || dom === self) continue;
    const prev = byDomain.get(dom);
    if (!prev) { byDomain.set(dom, u); continue; }
    // Merge — keep a company name / status if the enumerated row has one.
    byDomain.set(dom, { ...prev, company: prev.company || u.company, status: prev.status || u.status, subtype: prev.subtype });
  }
  return [...byDomain.values()];
}

// Rank which siblings are worth the WHOIS/NS probe: a live/active or for-sale
// sibling that carries a brand company name (name_match) ranks first; a bare
// registered ccTLD variant next; a resolved-inactive one last; skip the clearly
// unregistered (status inactive AND enumerated, no company).
function prioritize(siblings) {
  // Value tier: a report-related / brand-root / brand-name-matched sibling (a real
  // company or an explicit relation) beats a bare enumerated variant beats a
  // speculative ccTLD probe. Within a tier, live/registered ranks above inactive.
  const tier = (s) => {
    if (s.subtype === 'report_related' || s.subtype === 'name_match' || s.subtype === 'brand_root') return 0;
    if (s.subtype === 'cctld_variant') return 2;
    return 1;
  };
  const statusRank = (s) => (s === 'active' ? 0 : s === 'for_sale' ? 1 : s == null ? 2 : 3);
  return siblings
    .filter((s) => !(s.status === 'inactive' && s.subtype !== 'report_related' && !s.company))
    .sort((a, b) => (tier(a) - tier(b)) || (statusRank(a.status) - statusRank(b.status)) || (!!b.company - !!a.company))
    .slice(0, SIBLING_CAP);
}

// Crack the owner of `domain` by triangulating off its siblings. Returns
//   { found, owner, owner_type, confidence, method, evidence[], leads[], siblings[] }
// Everything free + fail-open; a total miss returns { found:false, leads:[], ... }.
export async function crackOwner({ domain, relatedDomains = [], context = {}, env = process.env } = {}) {
  const { domain: self } = seedParts(domain);
  if (!self) return { found: false, owner: null, leads: [], evidence: [], siblings: [], method: 'crack' };

  // Core domain's nameserver fingerprint (parallel with sibling enumeration).
  const [coreNs, siblingsRaw] = await Promise.all([
    liveNameservers(self, env).catch(() => []),
    gatherSiblings(self, relatedDomains),
  ]);
  const coreClass = classifyPair(coreNs);
  const probe = prioritize(siblingsRaw);

  // For each candidate sibling: free registrant lookup + its own NS fingerprint.
  // Bound concurrency (registrant WHOIS is raw port-43 and throttles when fired in
  // a big burst — the unconv.ai founder was lost to a 12-wide fan-out), so run the
  // whois+rdap merge PER sibling inside the same bounded pool as the NS fetch.
  const enriched = await mapPool(probe, NS_CONCURRENCY, async (p) => {
    const [regArr, sibNs] = await Promise.all([
      freeOwnerLookup([p.domain], { env }).catch(() => []),
      liveNameservers(p.domain, env).catch(() => []),
    ]);
    const reg = (regArr && regArr[0]) || {};
    const fp = fingerprintMatch(coreNs, sibNs);
    return { ...p, registrant: reg, nameservers: sibNs, fingerprint: fp };
  });

  // Score each sibling as an owner LEAD. A public registrant is the payload; the
  // fingerprint match is the confidence multiplier that it's the SAME owner.
  const knownPeople = (context && Array.isArray(context.people) ? context.people : []).map((p) => String(p || '').toLowerCase());
  const leads = [];
  for (const s of enriched) {
    const hasRegistrant = usableRegistrant(s.registrant);
    const regName = hasRegistrant ? (s.registrant.organization || s.registrant.name) : null;
    const fpStrength = s.fingerprint.strength;
    // A brand-name company from autocomplete (name_match) is itself a lead even
    // without a public registrant — it names the operating company behind the term.
    const brandCompany = (s.subtype === 'name_match' && s.company) ? s.company : null;
    if (!regName && !brandCompany) continue;

    let score = 0;
    score += fpStrength * 3;                       // fingerprint is the strongest confirmation
    if (hasRegistrant) score += 3;                 // a real public registrant
    if (s.registrant && s.registrant.email && !JUNK_REGISTRANT.test(s.registrant.email)) score += 1;
    if (brandCompany) score += 1;
    if (s.status === 'active') score += 1;
    // Cross-match against the report's already-known people/owner → corroboration.
    const matchedKnown = regName && knownPeople.some((k) => k && (regName.toLowerCase().includes(k) || k.includes(regName.toLowerCase())));
    if (matchedKnown) score += 2;

    const evidenceBits = [];
    if (fpStrength) evidenceBits.push(s.fingerprint.note);
    if (hasRegistrant) evidenceBits.push(`${s.domain} is publicly registered to ${regName}${s.registrant.email ? ` (${s.registrant.email})` : ''}`);
    if (brandCompany) evidenceBits.push(`brand search surfaced "${brandCompany}" operating on ${s.domain}`);
    if (matchedKnown) evidenceBits.push('matches a person already named in the report');

    leads.push({
      sibling: s.domain,
      owner: regName || brandCompany,
      owner_type: regName ? inferOwnerType(s.registrant) : 'company',
      email: (hasRegistrant && s.registrant.email && !JUNK_REGISTRANT.test(s.registrant.email)) ? s.registrant.email : null,
      registrar: (s.registrant && s.registrant.registrar) || null,
      status: s.status,
      subtype: s.subtype,
      fingerprint: s.fingerprint.match,
      score,
      evidence: evidenceBits,
    });
  }
  leads.sort((a, b) => b.score - a.score);

  const top = leads[0] || null;
  // Confidence: a fingerprint-confirmed public registrant = high; a public
  // registrant OR brand hit without fingerprint = medium; nothing = none.
  let confidence = 'none';
  if (top) {
    if (top.fingerprint !== 'none' && top.score >= 6) confidence = 'high';
    else if (top.score >= 5) confidence = 'medium';
    else confidence = 'low';
  }

  return {
    found: !!top,
    owner: top ? top.owner : null,
    owner_type: top ? top.owner_type : null,
    email: top ? top.email : null,
    confidence,
    method: 'sibling_fingerprint',
    core_nameservers: coreNs,
    core_ns_class: coreClass.kind,
    leads,
    evidence: top ? top.evidence : [],
    siblings: enriched.map((s) => ({
      domain: s.domain, status: s.status, subtype: s.subtype,
      registrant: usableRegistrant(s.registrant) ? (s.registrant.organization || s.registrant.name) : null,
      fingerprint: s.fingerprint.match,
    })),
  };
}

export default { crackOwner, fingerprintMatch };
