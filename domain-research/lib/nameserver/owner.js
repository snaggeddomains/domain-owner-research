// Nameserver Search — free owner triangulation.
//
// Given a set of domains (typically the LLM-flagged related siblings on a
// shared nameserver pairing), run the FREE registrant-identifying lookup
// (port-43 WHOIS, which follows the registry→registrar chain and exposes the
// public registrant name/org/email/phone) against each. No credits spent.
//
// The payoff: when several siblings on one pairing return the SAME registrant,
// that's a triangulated shared owner — exactly the ownership clue the pairing
// hinted at. Best-effort + parallel; a miss/privacy-redact just returns empty.
import { runTool } from '../sources/index.js';

const MAX = 12; // cap the fan-out (free, but be polite to WHOIS servers)

export async function freeOwnerLookup(domains, { env = process.env } = {}) {
  const list = [...new Set((domains || []).map((d) => String(d || '').trim().toLowerCase()).filter(Boolean))].slice(0, MAX);
  return Promise.all(list.map(async (domain) => {
    try {
      const r = await runTool('whois_lookup', { domain }, env);
      if (!r.ok) return { domain, error: r.error || 'lookup failed', privacy: null };
      const d = r.data || {};
      const reg = d.registrant || {};
      return {
        domain,
        registrar: d.registrar || null,
        created: d.created || null,
        name: reg.name || null,
        organization: reg.organization || null,
        email: reg.email || null,
        phone: reg.phone || null,
        country: reg.country || null,
        privacy: !!d.privacy,
      };
    } catch (e) {
      return { domain, error: String(e?.message || e), privacy: null };
    }
  }));
}
