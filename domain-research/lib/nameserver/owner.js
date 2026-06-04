// Nameserver Search — free owner triangulation.
//
// Given a set of domains (typically the LLM-flagged related siblings on a
// shared nameserver pairing), run the FREE registrant-identifying lookups
// against each and surface the registrant name/org/email/phone + registrar.
// No credits spent.
//
// Transport matters here: whois_lookup uses raw port-43 TCP, which is flaky on
// serverless. rdap_whois runs over HTTPS and is reliable, so we run BOTH in
// parallel and merge — WHOIS registrant fields preferred (richer), RDAP as the
// reliable fallback (registrar + registrant org when the registry publishes it).
//
// The payoff: when several siblings on one pairing return the SAME registrant,
// that's a triangulated shared owner — exactly the ownership clue the pairing
// hinted at. Best-effort + parallel; a miss/privacy-redact just returns empty.
import { runTool } from '../sources/index.js';

const MAX = 12; // cap the fan-out (free, but be polite to WHOIS/RDAP servers)

// Pull a field out of an RDAP entity's jCard (vcardArray):
//   ['vcard', [ ['fn',{},'text','Jane Doe'], ['org',{},'text','Acme'], ... ]]
function vcard(entity, key) {
  const arr = entity && Array.isArray(entity.vcardArray) ? entity.vcardArray[1] : null;
  if (!Array.isArray(arr)) return '';
  for (const e of arr) {
    if (Array.isArray(e) && e[0] === key) {
      const v = e[3];
      return typeof v === 'string' ? v : Array.isArray(v) ? v.filter(Boolean).join(' ') : '';
    }
  }
  return '';
}
export function rdapRegistrant(data) {
  const out = { registrar: null, name: null, organization: null, email: null };
  for (const ent of (data && data.entities) || []) {
    const roles = ent.roles || [];
    const fn = vcard(ent, 'fn');
    const org = vcard(ent, 'org');
    const email = vcard(ent, 'email');
    if (roles.includes('registrar') && fn) out.registrar = out.registrar || fn;
    if (roles.includes('registrant')) {
      out.name = out.name || fn || null;
      out.organization = out.organization || org || null;
      out.email = out.email || email || null;
    }
  }
  return out;
}

export async function freeOwnerLookup(domains, { env = process.env } = {}) {
  const list = [...new Set((domains || []).map((d) => String(d || '').trim().toLowerCase()).filter(Boolean))].slice(0, MAX);
  return Promise.all(list.map(async (domain) => {
    const [w, rd] = await Promise.all([
      runTool('whois_lookup', { domain }, env).catch((e) => ({ ok: false, error: String(e && e.message || e) })),
      runTool('rdap_whois', { domain }, env).catch((e) => ({ ok: false, error: String(e && e.message || e) })),
    ]);
    const reg = (w.ok && w.data && w.data.registrant) || {};
    const r = (rd.ok && rd.data) ? rdapRegistrant(rd.data) : {};
    const name = reg.name || r.name || null;
    const organization = reg.organization || r.organization || null;
    const email = reg.email || r.email || null;
    const phone = reg.phone || null;
    const registrar = (w.ok && w.data && w.data.registrar) || r.registrar || null;
    if (!w.ok && !rd.ok) {
      return { domain, error: w.error || rd.error || 'lookup failed', privacy: null };
    }
    const privacy = (w.ok && w.data && w.data.privacy && !name && !organization) || (!name && !organization && !email);
    return { domain, registrar, created: (w.ok && w.data && w.data.created) || null, name, organization, email, phone, country: reg.country || null, privacy };
  }));
}
