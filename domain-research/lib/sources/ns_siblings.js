import { samePairing } from '../nameserver/query.js';
import { isZoneDbConfigured } from '../db/supabase-zone.js';

// FREE — nameserver-pair triangulation off our internal 187M-row zone index.
// A domain on a UNIQUELY-configured nameserver pair (a custom Cloudflare-account
// pair, or a small private host) is almost certainly the SAME owner as every
// other domain on that EXACT pair — so a privacy-walled target can be cracked via
// a sibling on the pair that DOES have public WHOIS/contact. Generic parking/
// registrar nameservers (Afternic/Sedo/GoDaddy/Namecheap/Cloudflare-shared) are
// shared by millions of unrelated domains and are short-circuited (no signal).
export default {
  name: 'ns_siblings',
  description:
    'Nameserver-pair siblings (FREE, internal zone index). Resolves the domain\'s nameserver pair, classifies it, ' +
    'and — when the pair is UNIQUELY configured (a custom Cloudflare-account pair or a small private host, NOT ' +
    'generic parking/registrar NS) — returns OTHER domains on that EXACT pair. Those siblings are very likely the ' +
    'SAME owner (including off-theme personal/side domains), so one with public WHOIS can unmask a privacy-shielded ' +
    'owner. Pivot on a sibling: run whois_lookup / rdap_whois / dns_lookup on it, or web_search it. Generic NS ' +
    'returns no siblings (co-location there is NOT an ownership signal).',
  parameters: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Domain to triangulate by its nameserver pair (defaults to the target).' },
    },
  },
  async run({ domain }, { env }) {
    if (!isZoneDbConfigured()) return { configured: false, note: 'Zone index not configured.' };
    const r = await samePairing(domain, { limit: 60, env }).catch((e) => ({ error: String(e?.message || e) }));
    if (r.error) return { domain, error: r.error };
    const pair = r.pair || { kind: 'unknown', accountUnique: false, generic: false, note: '' };
    return {
      domain: r.domain,
      nameservers: r.nameservers || [],
      pair_kind: pair.kind, // cloudflare_account | shared | generic | unknown
      same_owner_signal: !!pair.accountUnique, // a custom pair → siblings are ~same owner
      generic: !!pair.generic,
      note: pair.note || '',
      ns_source: r.source || null, // how the NS were resolved (zone | live DNS | rdap)
      sibling_count: Array.isArray(r.rows) ? r.rows.length : 0,
      has_more: !!r.hasMore,
      // The actual siblings on the exact pairing (capped). Empty for generic NS.
      siblings: (r.rows || []).slice(0, 60).map((x) => x.domain),
    };
  },
};
