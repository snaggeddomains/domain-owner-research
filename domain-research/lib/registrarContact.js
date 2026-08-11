// Registrar → registrant-contact channel map.
//
// Almost every ICANN-accredited registrar runs a WHOIS-relay / registrant-contact
// form (or a privacy-proxy forwarding email) that reaches the CONCEALED registrant
// behind WHOIS privacy — this is the authoritative way to reach the owner of a
// privacy-shielded domain when we have no better direct lead. The report used to
// point at a generic registrar homepage; this resolves the PRECISE per-registrar
// relay so the recommended contact path links straight to it.
//
// Source of truth: the "Whois privacy" tab of Rob's registrar-contact sheet
// (docs.google.com/spreadsheets/d/15-pbi-xnB9YDGlxwgxJZtGzo5Njct9aMamcxoghpxAI).
// Each `url`/`email` may carry the placeholder token `domain.com` (or `domain.ru`,
// `<domain.com>`) — `registrarContactFor` substitutes the real domain in.
//
// To update: re-read the sheet and edit CONTACTS below; add a PATTERNS row for any
// registrar whose RDAP/WHOIS name doesn't normalize to the sheet label.

export const CONTACTS = [
  { registrar: '101 Domain', url: 'https://www.digitalprivacy.co/contact.htm' },
  { registrar: '1Api', url: 'https://domain-contact.org/' },
  { registrar: 'Acens', url: 'https://www.acens.com/hosting/dominios/whois/' },
  { registrar: 'Aliyun', url: 'https://whois.aliyun.com/whois/whoisForm' },
  { registrar: 'Amazon / AWS', url: 'https://registrar.amazon.com/whois?domain=domain.com' },
  { registrar: 'Ascio', url: 'https://whoiscontact.ascio.com/?domainname=domain.com' },
  { registrar: 'Automattic', email: 'domain.com@privatewho.is' },
  { registrar: 'Bluehost', url: 'https://www.bluehost.com/whois/results.jsp?domain=domain.com' },
  { registrar: 'Cloudflare', url: 'https://domaincontact.cloudflareregistrar.com/domain.com' },
  { registrar: 'CSC Corporate Domains', url: 'https://contactwhois.ingress-prod.cscglobal.com/contactwhois/domain.com/registrant' },
  { registrar: 'digitalregistra.co.id', url: 'https://whois.rumahweb.com/contact/' },
  { registrar: 'Dina Hosting', url: 'https://dinahosting.com/dominios/contacto-whois/dominio/domain.com' },
  { registrar: 'DNSPod.com', url: 'https://whois.cloud.tencent.com/domain?domain=domain.com' },
  { registrar: 'DomainCostClub.com', email: 'domain.com@dccprivacy.com' },
  { registrar: 'DomainDiscover', url: 'https://www.tierra.net/special/email_address_protection' },
  { registrar: 'DomainSpot', url: 'https://www.tierra.net/special/email_address_protection' },
  { registrar: 'DotEarth', email: 'registrant.domain.com@redirect.dotearth.info' },
  { registrar: 'Dynadot', url: 'https://www.dynadot.com/domain/contact-request' },
  { registrar: 'eName.com', url: 'https://whois.ename.net/contact/domain.com' },
  { registrar: 'eNom', url: 'https://tucowsdomains.com/whois-search/' },
  { registrar: 'Fabulous / Jewella', email: 'domain.com@fab.JewellaPrivacy.com' },
  { registrar: 'Gabia', url: 'https://domain.gabia.com/formmail/<domain.com>' },
  { registrar: 'Godaddy', url: 'https://www.godaddy.com/whois/results.aspx?domain=domain.com&action=contactDomainOwner', email: 'domain.com@domainsbyproxy.com' },
  { registrar: 'Hetzner', url: 'https://domain-contact.org/' },
  { registrar: 'Hostinger', url: 'https://www.hostinger.com/whois?domain=domain.com&view=contact' },
  { registrar: 'Hover.com', url: 'https://contactprivacy.com/' },
  { registrar: 'Instra', url: 'https://domain-contact.org' },
  { registrar: 'InterNetX.com', url: 'https://whoispro.domain-robot.org/whois/domain.com' },
  { registrar: 'IONOS', url: 'https://registrar.ionos.de/domains_raa/privacy?market=us_EN' },
  { registrar: 'Key Systems', url: 'https://domain-contact.org/' },
  { registrar: 'LiquidNet', url: 'https://rdap.liquidnetlimited.com' },
  { registrar: 'Marcaria', email: 'privacy@marcaria.com' },
  { registrar: 'MarkMonitor', url: 'https://whois-webform.markmonitor.com/whois/domain.com' },
  { registrar: 'MeshDigital', url: 'https://webform.meshdigital.com/' },
  { registrar: 'Metaregistrar', url: 'https://privacydomain.net/contact_domain/' },
  { registrar: 'Name.com', url: 'https://www.name.com/contact-domain-whois/domain.com' },
  { registrar: 'Namebay.com', url: 'https://www.namebay.com/whois/Whois.aspx?domain=domain.com' },
  { registrar: 'NameBright', url: 'https://www.namebright.com/contact/domain.com', email: 'domain.com@namebrightprivacy.com' },
  { registrar: 'Namesilo', url: 'https://www.privacyguardian.org/' },
  { registrar: 'Netim', url: 'https://www.netim.com/registrant-contact-form.html' },
  { registrar: 'Netistrar', url: 'https://application.privacyshield.org/domain-contact' },
  { registrar: 'Network Solutions', url: 'https://www.networksolutions.com/products/domain/whois?domain=domain.com' },
  { registrar: 'Nic.ru', url: 'https://www.nic.ru/whois/send-message/?domain=domain.ru' },
  { registrar: 'Onamae', email: 'domain.com@whoisprotectservice.com' },
  { registrar: 'One.com', url: 'https://www.one.com/en/whois' },
  { registrar: 'OVH', url: 'https://www.ovhcloud.com/en/domains/whois/' },
  { registrar: 'Pair Domains', url: 'https://whois.pairdomains.com/contact?domain=domain.com&type=registrant' },
  { registrar: 'Porkbun', url: 'https://porkbun.com/whois/contact/registrant/domain.com' },
  { registrar: 'Public Domain Registry', url: 'https://privacyprotect.org/' },
  { registrar: 'Rebel', url: 'https://www.rebel.com/messagedelivery/' },
  { registrar: 'Reg.ru', email: 'domain.com@regprivate.ru' },
  { registrar: 'Registar.eu', url: 'https://contact-form.registrar.eu/?domainName=domain.com&purpose=owner' },
  { registrar: 'Safenames', url: 'https://www.safenames.net/domain-names/whois-search' },
  { registrar: 'Sav', url: 'https://privacy.sav.com/?domain=domain.com' },
  { registrar: 'Scip.es', url: 'https://icann.online-validation.com/domain-contact/?domainname=domain.com' },
  { registrar: 'Spaceship', url: 'https://www.spaceship.com/domains/whois/?domain=domain.com' },
  { registrar: 'SquareSpace', url: 'https://domains.squarespace.com/whois-contact-form' },
  { registrar: 'Strato', url: 'https://registrar.strato.com/privacy' },
  { registrar: 'Tencent', url: 'https://whois.cloud.tencent.com/domain?domain=domain.com' },
  { registrar: 'Tierra', email: 'whois@emailaddressprotection.com' },
  { registrar: 'TLD Registrar Solutions', email: 'OWNER@domain.com.customers.whoisprivacycorp.com' },
  { registrar: 'Tucows', url: 'https://www.contactprivacy.com/' },
  { registrar: 'United Domains', url: 'https://www.united-domains.de/domain-inhaber-kontaktieren/' },
  { registrar: 'Unstoppable Domains', url: 'https://unstoppabledomains.com/whois?domain=domain.com' },
  { registrar: 'West.cn', url: 'https://www.west.cn/web/whoisform?domain=domain.com' },
  { registrar: 'Wild West Domains', url: 'https://www.secureserver.net/whois?plid=1387' },
  { registrar: 'Wix', url: 'https://wix-domains.com/', email: 'domain.com@wix-domains.com' },
];

// RDAP/WHOIS registrar names rarely match the sheet label verbatim ("GoDaddy.com,
// LLC" vs "Godaddy", "IONOS SE" vs "IONOS"). Each pattern maps a lowercased
// registrar-name match → the exact CONTACTS `registrar` key. First match wins.
const PATTERNS = [
  [/go\s*daddy/, 'Godaddy'],
  [/wild\s*west/, 'Wild West Domains'],
  [/ionos|1&1|1and1|1und1/, 'IONOS'],
  [/namesilo/, 'Namesilo'],
  [/namebright|turncommerce/, 'NameBright'],
  [/cloudflare/, 'Cloudflare'],
  [/dynadot/, 'Dynadot'],
  [/porkbun/, 'Porkbun'],
  [/network\s*solutions/, 'Network Solutions'],
  [/\benom\b/, 'eNom'],
  [/tucows|opensrs/, 'Tucows'],
  [/hover/, 'Hover.com'],
  [/name\.?com/, 'Name.com'],
  [/markmonitor/, 'MarkMonitor'],
  [/csc corporate|corporation service company|cscglobal/, 'CSC Corporate Domains'],
  [/safenames/, 'Safenames'],
  [/amazon/, 'Amazon / AWS'],
  [/squarespace|google/, 'SquareSpace'],
  [/\bwix\b/, 'Wix'],
  [/automattic|wordpress|knock\s*knock/, 'Automattic'],
  [/\bsav\b|sav\.com/, 'Sav'],
  [/public\s*domain\s*registry|publicdomainregistry|\bpdr\b/, 'Public Domain Registry'],
  [/gabia/, 'Gabia'],
  [/onamae|gmo internet|gmo-z/, 'Onamae'],
  [/reg\.?ru|regru|регистратор доменных/, 'Reg.ru'],
  [/nic\.?ru|ru-?center|regional network information/, 'Nic.ru'],
  [/\bovh\b/, 'OVH'],
  [/hetzner/, 'Hetzner'],
  [/hostinger/, 'Hostinger'],
  [/strato/, 'Strato'],
  [/one\.?com/, 'One.com'],
  [/united[- ]?domains/, 'United Domains'],
  [/key[- ]?systems/, 'Key Systems'],
  [/\b1\s*api\b/, '1Api'],
  [/internetx/, 'InterNetX.com'],
  [/ascio/, 'Ascio'],
  [/netim/, 'Netim'],
  [/netistrar/, 'Netistrar'],
  [/\brebel\b/, 'Rebel'],
  [/ename/, 'eName.com'],
  [/aliyun|alibaba/, 'Aliyun'],
  [/dnspod/, 'DNSPod.com'],
  [/tencent/, 'Tencent'],
  [/west\.cn|\bwest\b/, 'West.cn'],
  [/namebay/, 'Namebay.com'],
  [/pair\s*domains|pairnic|pair networks/, 'Pair Domains'],
  [/bluehost/, 'Bluehost'],
  [/metaregistrar/, 'Metaregistrar'],
  [/mesh\s*digital/, 'MeshDigital'],
  [/liquid\s*net/, 'LiquidNet'],
  [/marcaria/, 'Marcaria'],
  [/instra/, 'Instra'],
  [/dina\s*hosting/, 'Dina Hosting'],
  [/domaincostclub|domain cost club/, 'DomainCostClub.com'],
  [/domaindiscover/, 'DomainDiscover'],
  [/domainspot/, 'DomainSpot'],
  [/tierra/, 'Tierra'],
  [/dotearth/, 'DotEarth'],
  [/fabulous|jewella/, 'Fabulous / Jewella'],
  [/\bscip\b/, 'Scip.es'],
  [/registr?ar\.eu|registrareu/, 'Registar.eu'],
  [/unstoppable/, 'Unstoppable Domains'],
  [/tld registrar solutions|centralnic/, 'TLD Registrar Solutions'],
  [/digitalregistra|rumahweb/, 'digitalregistra.co.id'],
  [/101\s*domain/, '101 Domain'],
  [/spaceship/, 'Spaceship'],
  [/acens/, 'Acens'],
  [/digital\s*privacy/, '101 Domain'],
];

// IANA registrar-id → CONTACTS key, for the highest-volume registrars where the
// numeric id is the most reliable signal (RDAP `publicIds`). A superset is fine —
// name matching is the primary path; this only backstops odd name strings.
const IANA = {
  83: 'IONOS', 146: 'Godaddy', 48: 'eNom', 69: 'Tucows',
  1479: 'Namesilo', 2: 'Network Solutions', 1910: 'Cloudflare', 1861: 'Porkbun',
  472: 'Dynadot', 625: 'Name.com', 468: 'Amazon / AWS', 292: 'MarkMonitor',
  299: 'CSC Corporate Domains', 895: 'SquareSpace',
};

const BY_KEY = new Map(CONTACTS.map((c) => [c.registrar, c]));

// Collapse a registrar string to a normalized form for a loose fallback match.
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bd\/b\/a\b.*$/i, ' ')
    .replace(/[.,]/g, ' ')
    .replace(/\b(inc|llc|ltd|limited|gmbh|ag|sas|s\.a|sa|co|corp|corporation|company|uab|b\.?v|pty|plc|oy|sarl|kg|s\.?r\.?l|se|group|holdings)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Substitute the placeholder example domain with the REAL domain.
function fill(s, domain) {
  if (!s) return s;
  return s
    .replace(/<domain\.com>/gi, domain)
    .replace(/domain\.com/gi, domain)
    .replace(/domain\.ru/gi, domain);
}

// Resolve a registrar (from whoisLookup's { name, ianaId }) to its registrant-
// contact channel, with the real domain filled in. Returns
// { registrar, url?, email? } or null when the registrar isn't on the list.
export function registrarContactFor(registrar, domain) {
  if (!registrar || !domain) return null;
  const name = typeof registrar === 'string' ? registrar : registrar.name;
  const ianaId = typeof registrar === 'object' ? registrar.ianaId : null;
  const lc = String(name || '').toLowerCase();

  let key = null;
  for (const [re, k] of PATTERNS) {
    if (re.test(lc)) { key = k; break; }
  }
  if (!key && ianaId != null && IANA[Number(ianaId)]) key = IANA[Number(ianaId)];
  if (!key && name) {
    // loose normalized fallback: exact norm, else a registrar whose norm is a
    // token-prefix of the candidate (or vice-versa).
    const n = norm(name);
    if (n) {
      for (const c of CONTACTS) {
        const cn = norm(c.registrar);
        if (cn && (cn === n || n.startsWith(cn + ' ') || cn.startsWith(n + ' ') || n === cn.split(' ')[0])) { key = c.registrar; break; }
      }
    }
  }
  if (!key) return null;

  const row = BY_KEY.get(key);
  if (!row) return null;
  const out = { registrar: row.registrar };
  if (row.url) out.url = fill(row.url, domain);
  if (row.email) out.email = fill(row.email, domain);
  if (!out.url && !out.email) return null;
  return out;
}

export default { CONTACTS, registrarContactFor };
