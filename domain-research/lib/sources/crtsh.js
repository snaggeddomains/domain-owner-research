import { fetchJson } from '../util.js';

// Certificate Transparency — FREE, keyless. Every TLS certificate ever issued for a
// domain is public. The SANs on those certs reveal (a) the domain's OWN subdomains
// (app./mail./staging. → what they actually run) and (b) OTHER registrable domains
// that appeared on the SAME certificate as this one — a strong "same operator" signal
// that survives WHOIS privacy (you can't privacy-wall a cert).
//
// Two providers for resilience: crt.sh (best coverage, no cap) is tried first but is
// notoriously prone to 502/timeout; SSLMate's Certspotter is the fallback (keyless,
// higher limits with an optional CERTSPOTTER_API_KEY). Fail-open if both are down.
const CRTSH = 'https://crt.sh';
const CERTSPOTTER = 'https://api.certspotter.com/v1/issuances';

// Naive registrable-apex: last two labels, or last three for a handful of common
// two-part public suffixes. Good enough to GROUP hostnames; not a full PSL.
const TWO_PART = new Set(['co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'co.jp', 'com.br', 'co.in', 'com.mx']);
function apexOf(host) {
  const h = String(host || '').toLowerCase().replace(/^\*\./, '').replace(/\.$/, '');
  const parts = h.split('.').filter(Boolean);
  if (parts.length <= 2) return h;
  const last2 = parts.slice(-2).join('.');
  if (TWO_PART.has(last2)) return parts.slice(-3).join('.');
  return last2;
}

async function fromCrtsh(d) {
  const url = `${CRTSH}/?q=%25.${encodeURIComponent(d)}&output=json`;
  let rows;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { rows = await fetchJson(url, {}, 20000); lastErr = null; break; }
    catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 1200 * (attempt + 1))); }
  }
  if (lastErr) throw lastErr;
  const names = new Set();
  const issuers = new Set();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (r && r.issuer_name) issuers.add(String(r.issuer_name));
    for (const line of String((r && r.name_value) || '').split(/\s+/)) names.add(line);
    if (r && r.common_name) names.add(r.common_name);
  }
  return { names, issuers, count: Array.isArray(rows) ? rows.length : 0, provider: 'crt.sh' };
}

async function fromCertspotter(d, env) {
  const headers = env && env.CERTSPOTTER_API_KEY ? { Authorization: `Bearer ${env.CERTSPOTTER_API_KEY}` } : {};
  const url = `${CERTSPOTTER}?domain=${encodeURIComponent(d)}&include_subdomains=true&expand=dns_names&expand=issuer`;
  const rows = await fetchJson(url, { headers }, 20000);
  const names = new Set();
  const issuers = new Set();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (r && r.issuer && r.issuer.name) issuers.add(String(r.issuer.name));
    for (const n of (r && r.dns_names) || []) names.add(n);
  }
  return { names, issuers, count: Array.isArray(rows) ? rows.length : 0, provider: 'certspotter' };
}

export default {
  name: 'cert_transparency',
  description:
    'Certificate Transparency log search (crt.sh / Certspotter) — FREE. Returns every hostname that has appeared on ' +
    "a TLS certificate for the domain: the domain's own SUBDOMAINS (reveals the real services/apps they run) AND " +
    'OTHER registrable DOMAINS that shared a certificate with it (strong same-owner triangulation that WHOIS privacy ' +
    'cannot hide). Use it to crack a privacy-walled domain by finding a clearly-related sibling that DOES have public ' +
    "ownership info, and to map the operator's wider footprint.",
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string', description: 'Domain name, e.g. example.com' } },
    required: ['domain'],
  },
  async run({ domain }, { env } = {}) {
    const d = String(domain || '').trim().toLowerCase().replace(/^\*\./, '');
    if (!d) throw new Error('domain required');
    let got;
    try { got = await fromCrtsh(d); }
    catch { got = await fromCertspotter(d, env || process.env); } // crt.sh flaky → fall back

    // Normalize + classify the raw hostnames.
    const clean = new Set();
    for (const raw of got.names) {
      const h = String(raw || '').trim().toLowerCase().replace(/^\*\./, '').replace(/\.$/, '');
      if (h && h.includes('.') && !h.includes(' ')) clean.add(h);
    }
    const subdomains = [];
    const otherApexes = new Set();
    for (const h of clean) {
      if (h === d) continue;
      if (h.endsWith('.' + d)) subdomains.push(h);
      else { const a = apexOf(h); if (a && a !== d) otherApexes.add(a); }
    }
    return {
      domain: d,
      provider: got.provider,
      cert_count: got.count,
      subdomains: subdomains.sort().slice(0, 60),
      // Other registrable domains seen on this domain's certs — candidate same-owner siblings.
      related_domains: [...otherApexes].sort().slice(0, 60),
      other_hostnames: [...clean].filter((h) => h !== d && !h.endsWith('.' + d)).sort().slice(0, 60),
      issuers: [...got.issuers].slice(0, 8),
      note: otherApexes.size
        ? 'related_domains shared a TLS certificate with this domain — a strong same-operator signal to pursue for public ownership info.'
        : 'No cross-domain certificate siblings found; subdomains still show what the owner runs.',
    };
  },
};
