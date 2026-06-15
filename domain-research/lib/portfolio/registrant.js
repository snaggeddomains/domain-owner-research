// Corporate Portfolios — turn a SEED (a domain, a company name, or a registrant
// email) into the reverse-WHOIS search keys that actually find a portfolio.
//
// Reverse-WHOIS matches the registrant STRING (organization / email / name), not
// a domain. So a domain seed (meta.com) is most powerful: we look up its live
// WHOIS, pull the registrant org/email/name as they actually appear, and search
// those. A company-name seed is used directly; an email seed is the most precise.
//
// Falls back to the brand (the SLD) as a company term when the registrant is
// privacy/registrar-masked (MarkMonitor/CSC/Redacted) — better than nothing.

import whoisSource from '../sources/whois.js';

// Registrant strings that are NOT a real owner — registrars, resellers, brand-
// protection agents, and privacy/proxy/placeholder values. Reverse-searching any
// of these returns the registrar's whole unrelated book (that's how aol.com/mp3.com
// leaked into "Meta"), so they're rejected as search keys.
const JUNK_REGISTRANT = /(markmonitor|csc\s|cscglobal|corporate domains|registrarsafe|godaddy|namecheap|network solutions|tucows|enom|publicdomainregistry|pdr ltd|key-?systems|gandi|ovh|appdetex|com laude|nom-iq|safenames|brandsight|fairwinds|101domain|webnic|internet\.bs|reg\.ru|bigrock|namebright|dynadot|porkbun|whois|privacy|redacted|data protected|perfect privacy|domains by proxy|contact privacy|registration private|withheld|not disclosed|statutory masking|identity protect|proxy|whoisguard|domain administrator|domain admin|dns admin|hostmaster|abuse|select request|http)/i;
const isCleanEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()) && !JUNK_REGISTRANT.test(s);
const isCleanOrg = (s) => { const t = String(s || '').trim(); return t.length >= 3 && !JUNK_REGISTRANT.test(t); };

// Classify the raw input.
export function classifySeed(raw) {
  const s = String(raw || '').trim();
  if (!s) return { type: 'company', value: '' };
  if (/@/.test(s) && /\S+@\S+\.\S+/.test(s)) return { type: 'email', value: s.toLowerCase() };
  const d = s.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#\s]/)[0];
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) && !/\s/.test(s)) return { type: 'domain', value: d };
  return { type: 'company', value: s };
}

// → { seed, label, registrant, terms: [{ field:'company'|'email'|'name', term }] }
export async function deriveRegistrantKeys(raw, env) {
  const seed = classifySeed(raw);
  const terms = [];
  let label = String(raw || '').trim();
  let registrant = null;

  if (seed.type === 'email') {
    terms.push({ field: 'email', term: seed.value });
    label = seed.value;
  } else if (seed.type === 'company') {
    terms.push({ field: 'company', term: seed.value });
    terms.push({ field: 'name', term: seed.value });
    label = seed.value;
  } else {
    // Domain seed — derive the registrant from live WHOIS. Only keep CLEAN keys
    // (a real org/email, not a registrar/proxy/placeholder), so we don't reverse-
    // search a shared registrar string and pull its whole unrelated book.
    label = seed.value;
    const brand = seed.value.split('.')[0];
    try {
      const w = await whoisSource.run({ domain: seed.value }, { env });
      const r = (w && w.registrant) || {};
      registrant = { organization: r.organization || '', email: r.email || '', name: r.name || '', privacy: !!(w && w.privacy) };
      if (isCleanOrg(registrant.organization)) terms.push({ field: 'company', term: registrant.organization.trim() });
      if (isCleanEmail(registrant.email)) terms.push({ field: 'email', term: registrant.email.trim() });
      if (registrant.name && registrant.name !== registrant.organization && isCleanOrg(registrant.name)) terms.push({ field: 'name', term: registrant.name.trim() });
    } catch { /* WHOIS failed */ }
    // Brand fallback ONLY when WHOIS gave us nothing clean — the bare brand is a
    // substring match (noisy: "meta" hits unrelated orgs), so it's last-resort.
    if (!terms.length) terms.push({ field: 'company', term: brand, fallback: true });
  }

  // Dedupe (field+term, case-insensitive); drop empties.
  const seen = new Set();
  const uniq = [];
  for (const t of terms) {
    const term = String(t.term || '').trim();
    const k = `${t.field}:${term.toLowerCase()}`;
    if (term && !seen.has(k)) { seen.add(k); uniq.push({ field: t.field, term }); }
  }
  return { seed, label, registrant, terms: uniq };
}
