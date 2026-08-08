import { Resolver } from 'node:dns/promises';

// Email infrastructure as an OWNERSHIP signal — FREE, keyless (node:dns). Beyond
// the raw records dns_lookup returns, this parses the mail setup into owner hints:
//   - MX provider (who runs their email — Google Workspace / Microsoft 365 / a host)
//   - SPF include: hosts (the sending services they use — often names the operator)
//   - DMARC policy + rua/ruf REPORTING ADDRESSES — these are real, owner-controlled
//     mailboxes/domains that frequently reveal the operating company or a contact
//     route even when WHOIS is private.
// Also surfaces any marketplace VERIFICATION TXT tokens (afternic-verification, etc.)
// — a unique per-account string the owner published to list the domain, which can be
// reverse-searched to the owner's whole listed footprint.

const MX_PROVIDERS = [
  [/google|googlemail|aspmx/i, 'Google Workspace'],
  [/outlook|microsoft|office365|\.mail\.protection\.outlook/i, 'Microsoft 365'],
  [/proofpoint|pphosted/i, 'Proofpoint'],
  [/mimecast/i, 'Mimecast'],
  [/zoho/i, 'Zoho Mail'],
  [/protonmail|proton\.me/i, 'Proton Mail'],
  [/mxrecord|forwardemail|improvmx/i, 'Email forwarding'],
  [/secureserver|godaddy/i, 'GoDaddy'],
  [/messagingengine|fastmail/i, 'Fastmail'],
  [/amazonaws|amazonses/i, 'Amazon SES'],
];
function mxProvider(hosts) {
  const j = hosts.join(' ');
  for (const [re, label] of MX_PROVIDERS) if (re.test(j)) return label;
  return hosts.length ? 'Other/self-hosted' : null;
}

const GENERIC_SPF = /^(_?spf\.google|spf\.protection\.outlook|_spf\.|sendgrid|mailgun|amazonses|servers\.mcsv|_spf\.salesforce|spf\.mandrillapp|helpscout|zoho|mailchimp|include:_spf)/i;

export default {
  name: 'email_infra',
  description:
    "Parse a domain's email infrastructure into ownership hints (FREE): the MX provider, the SPF include: hosts, " +
    'and the DMARC policy + rua/ruf REPORTING ADDRESSES. The DMARC reporting mailboxes and non-generic SPF hosts ' +
    'often name the operating company or a real contact route even when WHOIS is private. Also flags any ' +
    'marketplace verification TXT tokens (afternic-verification, etc.) that tie the domain to a seller account.',
  parameters: {
    type: 'object',
    properties: { domain: { type: 'string', description: 'Domain name, e.g. example.com' } },
    required: ['domain'],
  },
  async run({ domain }) {
    const d = String(domain || '').trim().toLowerCase();
    if (!d) throw new Error('domain required');
    const r = new Resolver();
    const [mxR, txtR, dmarcR] = await Promise.allSettled([
      r.resolveMx(d),
      r.resolveTxt(d),
      r.resolveTxt(`_dmarc.${d}`),
    ]);
    const mx = mxR.status === 'fulfilled' ? mxR.value.sort((a, b) => a.priority - b.priority).map((m) => m.exchange.toLowerCase().replace(/\.$/, '')) : [];
    const txt = (txtR.status === 'fulfilled' ? txtR.value : []).map((t) => t.join(''));
    const dmarcTxt = (dmarcR.status === 'fulfilled' ? dmarcR.value : []).map((t) => t.join(''));

    // SPF
    const spf = txt.find((t) => /^v=spf1/i.test(t)) || null;
    const spfIncludes = [];
    if (spf) for (const m of spf.matchAll(/include:([^\s]+)/gi)) spfIncludes.push(m[1].toLowerCase());
    const spfOwnerHints = spfIncludes.filter((h) => !GENERIC_SPF.test('include:' + h) && !GENERIC_SPF.test(h));

    // DMARC
    const dmarc = dmarcTxt.find((t) => /^v=dmarc1/i.test(t)) || null;
    let dmarcPolicy = null;
    const dmarcContacts = [];
    if (dmarc) {
      const p = dmarc.match(/[;\s]p=([a-z]+)/i);
      dmarcPolicy = p ? p[1].toLowerCase() : null;
      for (const key of ['rua', 'ruf']) {
        const m = dmarc.match(new RegExp(`${key}=([^;]+)`, 'i'));
        if (m) for (const uri of m[1].split(',')) {
          const em = uri.trim().match(/mailto:([^!\s]+)/i);
          if (em) dmarcContacts.push(em[1].toLowerCase());
        }
      }
    }

    // Marketplace / control-verification TXT tokens (owner triangulation).
    const verifyTokens = txt.filter((t) => /(afternic|sedo|dan|godaddy|namecheap|atom|spaceship)[-_]?verif|domain[-_]?verification|=.{16,}\b(verify|verification)/i.test(t)).slice(0, 8);

    // Contact-domain hints: the registrable domain of any DMARC reporting mailbox
    // whose domain differs from this one often IS the operator.
    const contactDomains = [...new Set(dmarcContacts.map((e) => (e.split('@')[1] || '').toLowerCase()).filter((x) => x && x !== d))];

    return {
      domain: d,
      mx,
      mx_provider: mxProvider(mx),
      spf,
      spf_includes: spfIncludes,
      spf_owner_hints: spfOwnerHints,
      dmarc_policy: dmarcPolicy,
      dmarc_reporting_addresses: [...new Set(dmarcContacts)],
      operator_domain_hints: contactDomains,
      verification_tokens: verifyTokens,
      note: contactDomains.length
        ? `DMARC reports go to ${contactDomains.join(', ')} — a candidate operating/contact domain to pursue.`
        : (spfOwnerHints.length ? 'Non-generic SPF hosts may name the operator; check spf_owner_hints.' : 'No distinctive email-ownership hints.'),
    };
  },
};
