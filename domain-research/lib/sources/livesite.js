import { normalizeDomain, isValidDomain, fetchText, extractClues } from '../util.js';

// crude host + eTLD+1 (last two labels) — good enough to tell an off-site redirect
// (domain → a DIFFERENT root domain) from a same-site www/scheme hop.
function hostOf(u) { try { return new URL(/^https?:\/\//i.test(u) ? u : `http://${u}`).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } }
function rootOf(host) { const p = String(host || '').split('.').filter(Boolean); return p.length <= 2 ? p.join('.') : p.slice(-2).join('.'); }

// Free. The live site is often the fastest path to an owner — a real business
// exposes a company name/contact, and a parked domain exposes the broker /
// "make offer" path and the parking platform.
export default {
  name: 'livesite_inspect',
  description:
    "Free. Fetches the domain's live website (https, falling back to http) and extracts ownership clues from the " +
    'page and its source: title, company/brand hints, emails, social links, analytics IDs (GA/GTM/Meta Pixel), ' +
    'copyright line, and parking/for-sale signals (parking platform, broker, "Make Offer"). For parked domains ' +
    'this frequently surfaces the broker or seller.',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string' } },
    required: ['domain'],
  },
  async run({ domain }) {
    const d = normalizeDomain(domain);
    if (!isValidDomain(d)) throw new Error(`Invalid domain: ${domain}`);

    let resp = null;
    let scheme = 'https';
    let httpsOk = true;
    let httpsError = null;
    try {
      resp = await fetchText(`https://${d}/`);
    } catch (e) {
      httpsOk = false;
      httpsError = e?.message || String(e);
      try {
        resp = await fetchText(`http://${d}/`);
        scheme = 'http';
      } catch (e2) {
        return { reachable: false, https_ok: false, https_error: httpsError, error: `Could not fetch over https or http: ${e2?.message || e2}` };
      }
    }

    // Off-site redirect detection: did the final URL land on a DIFFERENT root domain?
    const finalRoot = rootOf(hostOf(resp.finalUrl || ''));
    const reqRoot = rootOf(d);
    const offsite = Boolean(finalRoot && reqRoot && finalRoot !== reqRoot);
    // KEY nuance: a redirect seen ONLY after https failed (scheme fell back to http) is
    // HTTP-ONLY — a browser is https-first, so it hits the broken-https error and NEVER
    // follows the redirect. Reporting it as an "open"/live redirect misleads (this is the
    // translucent.com case: http://→translucent.ca, but https://translucent.com is dead).
    const httpOnlyRedirect = offsite && scheme === 'http' && !httpsOk;
    const redirect = offsite
      ? { offsite: true, target: finalRoot, target_url: resp.finalUrl, http_only: httpOnlyRedirect }
      : null;

    return {
      reachable: true,
      scheme,
      https_ok: httpsOk,
      ...(httpsError ? { https_error: httpsError } : {}),
      http_status: resp.status,
      final_url: resp.finalUrl,
      redirect,
      // Plain, agent-readable caveat so the NARRATIVE doesn't call this an "open redirect".
      ...(httpOnlyRedirect ? {
        note: `The redirect to ${finalRoot} is HTTP-ONLY — ${d} has no working HTTPS (${httpsError || 'TLS handshake failed'}), so a browser (HTTPS-first) does NOT follow it and instead shows a security/connection error. Do not describe this as an "open" or browser-visible redirect.`,
      } : {}),
      ...extractClues(resp.body || ''),
    };
  },
};
