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
  let listed = false;
  const platforms = [];
  const prices = [];
  for (const d of traceData(trace, 'marketplace_check')) {
    if (d.any_listed) listed = true;
    for (const ch of Array.isArray(d.channels) ? d.channels : []) {
      if (ch && ch.listed) {
        listed = true;
        if (ch.channel) platforms.push(String(ch.channel));
        for (const p of Array.isArray(ch.prices) ? ch.prices : []) prices.push(String(p));
      }
    }
    if (d.seller_portfolio && d.seller_portfolio.for_sale) listed = true;
  }
  const ownerType = sum.ownerType || json.owner_type || null;
  if (ownerType === 'domain_investor' || ownerType === 'marketplace_only') listed = true;
  // Narrative fallback for the platform name if the trace didn't give one.
  if (!platforms.length) {
    const m = narrative.match(MARKETPLACE_RE);
    if (m && /\b(listed|for sale|asking|buy now|make offer)\b/i.test(narrative)) {
      platforms.push(...m.map((x) => x.replace(/\.com$/i, '')));
      if (m.length) listed = listed || /\b(listed|for sale|asking|buy now|make offer)\b/i.test(narrative);
    }
  }
  const platform = [...new Set(platforms.map((p) => p.toLowerCase()))]
    .map((p) => ({ afternic: 'Afternic', godaddy: 'GoDaddy', sedo: 'Sedo', atom: 'Atom', dan: 'Dan', squadhelp: 'Squadhelp', dynadot: 'Dynadot' }[p] || (p.charAt(0).toUpperCase() + p.slice(1))))
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

  // ── breadcrumbs from the narrative ────────────────────────────────────────
  const acquisition = /\bacqui(red|sition)\b/i.test(narrative) || /\b(merger|consolidat|inherited)\b/i.test(narrative);
  const clusterTie = traceData(trace, 'registration_cluster').some(
    (d) => d && Array.isArray(d.siblings) && d.siblings.some((s) => s && s.same_registrant),
  );
  const largeCompanyHint = siteActive && /\b(Inc\.?|Corporation|Holdings|publicly traded|enterprise|Fortune\s?\d|NYSE|NASDAQ|global)\b/.test(narrative);

  const likelyOwner = sum.likelyOwner || null;
  const primary = sum.primaryContact || null;
  const hasPrimaryContact = Boolean(primary && primary.value);
  const privacy = /\b(privacy|redacted for privacy|domains? by proxy|whoisguard|privacyguardian|proxy-?protected)\b/i.test(narrative);

  return {
    domain,
    ownerType,
    confidence: sum.confidence || null,
    likelyOwner,
    summary: sum.summary || json.summary || null,
    firstName: firstNameOf(primary && primary.type === 'name' ? primary.value : likelyOwner),
    primaryContactName: (primary && primary.type === 'name' && primary.value) || (likelyOwner || ''),
    hasPrimaryContact,
    contacts: Array.isArray(json.contacts) ? json.contacts : [],
    contactPath: Array.isArray(json.contact_path) ? json.contact_path : [],
    timeline: Array.isArray(json.timeline) ? json.timeline : [],
    listed,
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
    narrativeExcerpt: narrative.trim().slice(0, 4000),
  };
}
