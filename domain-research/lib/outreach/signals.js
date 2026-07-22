// Derive the signals the outreach classifier + drafting prompt need from a
// finished research run. Leans primarily on the report's PART-1 JSON (the
// agent's structured conclusion) and the normalized summary; reads the tool
// trace and the narrative best-effort for marketplace / redirect / acquisition
// breadcrumbs (trace `data` is truncated to 4000 chars, so JSON.parse can fail —
// every read here is defensive and non-fatal).

import { extractReportJson, summarizeReport } from '../reportSummary.js';

const MARKETPLACE_RE = /\b(afternic|godaddy|dan\.com|\bdan\b|sedo|atom\.com|\batom\b|squadhelp|namecheap market|sav\.com|efty|brandbucket|dynadot)\b/gi;

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function rootOf(host) {
  // crude eTLD+1: last two labels (good enough for the "redirects to a DIFFERENT
  // site than the domain itself" check).
  const parts = String(host || '').toLowerCase().split('.').filter(Boolean);
  return parts.length <= 2 ? parts.join('.') : parts.slice(-2).join('.');
}

function firstNameOf(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  // Strip an org-ish trailing (Inc, LLC…) and take the first token if it looks
  // like a person's given name.
  const first = s.split(/\s+/)[0];
  if (/^(the|inc|llc|ltd|corp|group|holdings)$/i.test(first)) return '';
  return /^[A-Z][a-zA-Z'’.-]+$/.test(first) ? first : '';
}

function traceData(trace, toolName) {
  const out = [];
  for (const t of Array.isArray(trace) ? trace : []) {
    if (!t || t.tool !== toolName || !t.data) continue;
    try {
      out.push(JSON.parse(t.data));
    } catch {
      /* truncated/partial — skip */
    }
  }
  return out;
}

export function extractSignals(report, domain = '') {
  const md = (report && report.markdown) || '';
  const json = extractReportJson(md) || {};
  const sum = summarizeReport(report || {});
  const trace = (report && report.trace) || [];
  const narrative = md.replace(/```json[\s\S]*?```/i, '');

  const domainRoot = rootOf(hostOf(`http://${domain}`) || domain);

  // ── marketplace / for-sale ────────────────────────────────────────────────
  // The AUTHORITATIVE real-time marketplace sources (DomainScout + the page-scrape check)
  // WIN. We only fall back to inferring "listed" from owner_type / the narrative when NO
  // marketplace source authoritatively resolved the state — otherwise a narrative that
  // merely *claims* a listing (agent inference) would wrongly override a for-sale strip
  // that clearly says "not listed" (e.g. electron.ai: for_sale:false, any_listed:false,
  // yet the narrative claimed it was "listed across multiple marketplaces").
  let listed = false;           // a source affirmatively found a live listing
  let checkedNotListed = false; // a source ran and found NO listing
  const platforms = [];
  const prices = [];
  for (const d of traceData(trace, 'marketplace_check')) {
    const chans = Array.isArray(d.channels) ? d.channels : [];
    let any = d.any_listed === true;
    for (const ch of chans) {
      if (ch && ch.listed) {
        any = true;
        if (ch.channel) platforms.push(String(ch.channel));
        for (const p of Array.isArray(ch.prices) ? ch.prices : []) prices.push(String(p));
      }
    }
    if (d.seller_portfolio && d.seller_portfolio.for_sale) any = true;
    if (any) listed = true;
    else if (chans.length || d.any_listed === false) checkedNotListed = true;
  }
  for (const d of traceData(trace, 'domainscout_lookup')) {
    const mps = Array.isArray(d.marketplaces) ? d.marketplaces : [];
    let any = d.for_sale === true;
    for (const m of mps) {
      if (m && m.listed) {
        any = true;
        if (m.name) platforms.push(String(m.name));
        if (m.price) prices.push(String(m.price));
      }
    }
    if (any) listed = true;
    else if (mps.length || d.for_sale === false) checkedNotListed = true;
  }
  const ownerType = sum.ownerType || json.owner_type || null;
  // Fall back to owner_type / narrative ONLY when no marketplace source authoritatively
  // said "not listed" — so we never contradict the verified for-sale strip.
  if (!listed && !checkedNotListed) {
    if (ownerType === 'domain_investor' || ownerType === 'marketplace_only') listed = true;
    if (!platforms.length) {
      const m = narrative.match(MARKETPLACE_RE);
      if (m && /\b(listed|for sale|asking|buy now|make offer)\b/i.test(narrative)) {
        platforms.push(...m.map((x) => x.replace(/\.com$/i, '')));
        listed = true;
      }
    }
  }
  const platform = [...new Set(platforms.map((p) => p.toLowerCase()))]
    .map((p) => ({ afternic: 'Afternic', godaddy: 'GoDaddy', sedo: 'Sedo', atom: 'Atom', dan: 'Dan', squadhelp: 'Squadhelp', dynadot: 'Dynadot', namecheap: 'Namecheap', sav: 'Sav', dropcatch: 'DropCatch' }[p] || (p.charAt(0).toUpperCase() + p.slice(1))))
    .join(' / ');

  // ── live site / redirect / parked ─────────────────────────────────────────
  let redirectsToParent = false;
  let parentHost = '';
  let siteActive = false;
  let parked = false;
  for (const d of traceData(trace, 'livesite_inspect')) {
    if (!d || !d.reachable) {
      if (d && d.reachable === false) parked = true;
      continue;
    }
    const finalHost = hostOf(d.final_url || '');
    if (finalHost && domainRoot && rootOf(finalHost) !== domainRoot) {
      redirectsToParent = true;
      parentHost = finalHost;
    }
    const clues = d.clues || d;
    const parking = (clues && clues.parking) || d.parking;
    if (parking && ((Array.isArray(parking.for_sale_signals) && parking.for_sale_signals.length) || parking.platform || parking.broker)) {
      parked = true;
    } else if (!redirectsToParent) {
      siteActive = true;
    }
  }

  // ── breadcrumbs / indicators from the narrative + structured fields ───────
  const acquisition = /\bacqui(red|sition|res)\b/i.test(narrative) || /\b(merger|consolidat|inherited|portfolio cleanup|brand consolidation)\b/i.test(narrative);
  const clusterTie = traceData(trace, 'registration_cluster').some(
    (d) => d && Array.isArray(d.siblings) && d.siblings.some((s) => s && s.same_registrant),
  );
  const largeCompanyHint = siteActive && /\b(Inc\.?|Corporation|Holdings|publicly traded|enterprise|Fortune\s?\d|NYSE|NASDAQ|multinational|global)\b/.test(narrative);

  const likelyOwner = sum.likelyOwner || null;
  const primary = sum.primaryContact || null;
  const hasPrimaryContact = Boolean(primary && primary.value);
  const privacy = /\b(privacy|redacted for privacy|domains? by proxy|whoisguard|privacyguardian|proxy-?protected|withheld for privacy)\b/i.test(narrative);

  const confidenceBand = sum.confidence || null;
  const ownerTypeRaw = ownerType || 'unknown';
  const isCompany = ownerTypeRaw === 'active_company';
  const isIndividual = ownerTypeRaw === 'individual';
  const formerOperator = ownerTypeRaw === 'former_operator';
  // "Used to be associated with the name but might still own it" (the pavilion.com
  // case): a former operator, or narrative language to that effect.
  const mayStillOwn = formerOperator
    || /\b(may|might|could|possibly|likely) (still )?(own|hold|control|retain)\b/i.test(narrative)
    || /\b(former|previously|used to|at the time|your time with|back when|legacy)\b/i.test(narrative);
  const priorCompanyTie = acquisition || clusterTie
    || /\b(traces? back to|tied to|associated with|connected to|your time with|formerly of|ex-)\b/i.test(narrative);
  // More than one named primary stakeholder to address (the corporate / "Hi Names" case).
  const namedContacts = (Array.isArray(json.contacts) ? json.contacts : []).filter(
    (c) => c && c.type === 'name' && c.value && String(c.tier || '').toLowerCase() !== 'tertiary',
  );
  const multiStakeholder = namedContacts.length > 1 || /\b(owners|stakeholders|team|all as the owners)\b/i.test(narrative);

  return {
    domain,
    ownerType: ownerTypeRaw,
    confidence: confidenceBand,
    confidenceBand,
    likelyOwner,
    summary: sum.summary || json.summary || null,
    firstName: firstNameOf(primary && primary.type === 'name' ? primary.value : likelyOwner),
    primaryContactName: (primary && primary.type === 'name' && primary.value) || (likelyOwner || ''),
    namedContactNames: namedContacts.map((c) => String(c.value).trim()),
    hasPrimaryContact,
    namedOwner: hasPrimaryContact && Boolean(primary && primary.type === 'name'),
    contacts: Array.isArray(json.contacts) ? json.contacts : [],
    contactPath: Array.isArray(json.contact_path) ? json.contact_path : [],
    timeline: Array.isArray(json.timeline) ? json.timeline : [],
    listed,
    // A marketplace source ran and authoritatively found NO live listing — lets the drafter
    // avoid claiming "listed for sale" even when the narrative loosely implies it.
    verifiedNotListed: !listed && checkedNotListed,
    platform,
    prices,
    redirectsToParent,
    parentHost,
    siteActive,
    parked,
    acquisition,
    clusterTie,
    largeCompanyHint,
    privacy,
    isCompany,
    isIndividual,
    formerOperator,
    mayStillOwn,
    priorCompanyTie,
    multiStakeholder,
    // Full agent narrative (PART-2) for the drafter to read — the agent's own
    // synthesis, the richest concise context we have. Capped generously.
    narrative: narrative.trim().slice(0, 9000),
    narrativeExcerpt: narrative.trim().slice(0, 4000),
  };
}

