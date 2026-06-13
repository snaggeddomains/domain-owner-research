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
    // Domain seed — derive the registrant from live WHOIS, then add the brand.
    label = seed.value;
    const brand = seed.value.split('.')[0];
    try {
      const w = await whoisSource.run({ domain: seed.value }, { env });
      const r = (w && w.registrant) || {};
      registrant = { organization: r.organization || '', email: r.email || '', name: r.name || '', privacy: !!(w && w.privacy) };
      if (!registrant.privacy) {
        if (registrant.organization) terms.push({ field: 'company', term: registrant.organization });
        if (registrant.email) terms.push({ field: 'email', term: registrant.email });
        if (registrant.name && registrant.name !== registrant.organization) terms.push({ field: 'name', term: registrant.name });
      }
    } catch { /* WHOIS failed → brand only */ }
    // Always include the brand as a company term (covers masked registrants and
    // catches sister domains the WHOIS org string might miss).
    terms.push({ field: 'company', term: brand });
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
