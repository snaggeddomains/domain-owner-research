// Nameserver Search ⇄ Domain Owner report bridge.
//
// Two helpers shared by BOTH directions (the Nameserver Search tool pulling a
// report for context, and — later — the report agent calling the pairing engine):
//   • classifyPair(nameservers) — is this an ACCOUNT-UNIQUE pair (Cloudflare-style,
//     where the same pair == the same owner) or a generic shared host?
//   • extractReportContext(run) — distill a Domain Owner run's report into a compact
//     owner/industry/people context block to steer the relatedness LLM.
import { getRun } from '../db/runs.js';

// Nameservers shared by HUGE numbers of unrelated domains — parking/marketplace
// services and default registrar DNS. Co-location on these says nothing about
// ownership, and the match set is so large the reverse query would time out, so
// we short-circuit with an explanation instead of running it.
const GENERIC_NS = {
  'afternic.com': 'Afternic (marketplace/parking)',
  'sedoparking.com': 'Sedo parking',
  'sedo.com': 'Sedo',
  'bodis.com': 'Bodis parking',
  'parkingcrew.net': 'ParkingCrew',
  'above.com': 'Above/Trellian parking',
  'dan.com': 'Dan marketplace',
  'undeveloped.com': 'Dan/Undeveloped',
  'fabulous.com': 'Fabulous parking',
  'hugedomains.com': 'HugeDomains',
  'voodoo.com': 'Voodoo parking',
  'domaincontrol.com': 'GoDaddy default DNS',
  'registrar-servers.com': 'Namecheap default DNS',
  'dnsowl.com': 'Namecheap/Hostinger DNS',
  'sav.com': 'Sav',
  'name.com': 'Name.com default DNS',
};
function genericProvider(ns) {
  for (const suf of Object.keys(GENERIC_NS)) {
    if (ns.some((n) => n === suf || n.endsWith('.' + suf))) return GENERIC_NS[suf];
  }
  return null;
}

// Cloudflare assigns each ACCOUNT one fixed nameserver pair (e.g.
// deb/ernest.ns.cloudflare.com), so two domains on the exact same Cloudflare pair
// are almost certainly the same owner — even when the names look unrelated. Other
// pairs may be a shared host serving many owners. This classification is a strong
// prior for the relatedness pass.
export function classifyPair(nameservers) {
  const ns = (nameservers || []).map((n) => String(n || '').toLowerCase()).filter(Boolean);
  if (!ns.length) return { kind: 'unknown', accountUnique: false, generic: false, note: '' };
  if (ns.length >= 2 && ns.every((n) => /(^|\.)ns\.cloudflare\.com$/.test(n))) {
    return {
      kind: 'cloudflare_account',
      accountUnique: true,
      generic: false,
      note: 'Cloudflare assigns each ACCOUNT a unique nameserver pair, so every domain on this exact pair is almost certainly the SAME owner — including names that look unrelated (often the team\'s personal or side domains). Do not discard a sibling just because its name is off-theme; instead LABEL what it is.',
    };
  }
  const provider = genericProvider(ns);
  if (provider) {
    return {
      kind: 'generic',
      accountUnique: false,
      generic: true,
      provider,
      note: `These are ${provider} nameservers — shared by a huge number of unrelated domains, so being on this pairing is NOT an ownership signal.`,
    };
  }
  return {
    kind: 'shared',
    accountUnique: false,
    generic: false,
    note: 'These nameservers may be a shared host used by many different owners, so co-location alone is NOT proof of shared ownership. Judge each sibling by whether it fits the owner\'s identity/industry, not merely that it shares the nameservers.',
  };
}

function parseJsonBlock(md) {
  const m = String(md || '').match(/```json\s*([\s\S]*?)```/i);
  if (!m) return null;
  try { return JSON.parse(m[1].trim()); } catch { return null; }
}

// Distill a run's stored report into context for the relatedness LLM. Returns
// null when there's no usable report. `text` is the prompt block; `people` /
// `emailDomains` are for cross-linking sibling registrants to known owners.
export function extractReportContext(run) {
  const md = (run && run.report && run.report.markdown) || '';
  if (!md) return null;
  const j = parseJsonBlock(md) || {};
  const narrative = md.replace(/```json\s*[\s\S]*?```/i, '').replace(/\s+/g, ' ').trim().slice(0, 3500);
  const contacts = Array.isArray(j.contacts) ? j.contacts : [];
  const people = contacts
    .filter((c) => ['name', 'email', 'social'].includes(String(c && c.type).toLowerCase()))
    .map((c) => ({ type: c.type, value: c.value, note: c.note || '' }));
  const emailDomains = [...new Set(
    contacts.filter((c) => String(c && c.type).toLowerCase() === 'email' && /@/.test(c.value || ''))
      .map((c) => c.value.split('@')[1].toLowerCase()),
  )];
  const text = [
    j.likely_owner ? `Likely owner: ${j.likely_owner}` : '',
    j.owner_type ? `Owner type: ${j.owner_type}` : '',
    j.confidence ? `Identity confidence: ${j.confidence}` : '',
    j.summary ? `Summary: ${j.summary}` : '',
    contacts.length ? `Known people/contacts: ${contacts.slice(0, 12).map((c) => `${c.type}: ${c.value}${c.note ? ` (${c.note})` : ''}`).join('; ')}` : '',
    emailDomains.length ? `Associated email domains: ${emailDomains.join(', ')}` : '',
    narrative ? `Report narrative (excerpt): ${narrative}` : '',
  ].filter(Boolean).join('\n');
  return {
    domain: run.domain,
    owner: j.likely_owner || null,
    ownerType: j.owner_type || null,
    summary: j.summary || null,
    people,
    emailDomains,
    text,
  };
}

// Convenience: load + extract by run id (best-effort).
export async function reportContextByRunId(runId) {
  if (!runId) return null;
  try { return extractReportContext(await getRun(runId)); } catch { return null; }
}
