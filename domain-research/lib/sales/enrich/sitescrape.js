// Sales Research — SITE-SCRAPE contact lever. Many small / early companies have no
// Apollo / RocketReach / FullEnrich coverage, but their real contact info is sitting
// in plain sight — in the footer, on an About/Contact/Team page (e.g. godelegate.com
// has it in the footer). So when the paid vendors come up thin, we skim the company's
// own site for emails + phones. FREE, no API key. Best-effort + fail-open throughout.

import { fetchText } from '../../util.js';

// Common pages that carry contact info, tried in order after the homepage.
const CONTACT_PATHS = ['', 'about', 'about-us', 'contact', 'contact-us', 'team', 'company'];

// Role/inbox localparts — a company inbox, not a person. Surface them (labelled) when
// we can't find a named decision-maker; a real reply address beats nothing for outreach.
const ROLE_LOCALPARTS = new Set(['info', 'hello', 'hi', 'contact', 'team', 'sales', 'support',
  'founders', 'founder', 'admin', 'press', 'media', 'partnerships', 'partner', 'help', 'inquiries', 'hey']);

// Junk / vendor / tracking addresses that aren't a real contact.
const JUNK_EMAIL_RE = /@(sentry|wixpress|example|email|domain|yourdomain|sentry\.io|schema|w3\.org|googleapis|cloudfront|gravatar|jsdelivr|fontawesome)\b|\.(png|jpe?g|gif|svg|webp|css|js)$|^[0-9a-f]{16,}@|@2x|@example\./i;

const EMAIL_RE = /[a-z0-9][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}/gi;
// A phone-ish run (loose — we only keep ones near a tel: or a contact page).
const TEL_RE = /(?:\+?\d[\s().-]?){7,}\d/g;

const regHost = (d) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
const regDomain = (d) => { const h = regHost(d); const p = h.split('.').filter(Boolean); return p.length >= 2 ? p.slice(-2).join('.') : h; };

// Pull mailto: addresses with the visible/adjacent text (a name or role sits next to it).
function mailtosWithContext(html) {
  const out = [];
  const re = /<a[^>]+href=["']mailto:([^"'?]+)[^"']*["'][^>]*>([\s\S]{0,80}?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && out.length < 40) {
    const email = m[1].trim().toLowerCase();
    const label = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    out.push({ email, label });
  }
  return out;
}

// Does a label look like a person's name (Title Case, 2–3 words, no digits/@)?
function nameFromLabel(label) {
  const s = String(label || '').trim();
  if (!s || s.includes('@') || /\d/.test(s)) return null;
  const words = s.split(/\s+/);
  if (words.length < 2 || words.length > 3) return null;
  if (!words.every((w) => /^[A-Z][a-zA-Z'.-]+$/.test(w))) return null;
  return s;
}

// Turn an email localpart into a plausible display name (jane.doe → Jane Doe) — only
// when it clearly encodes a person (has a separator and isn't a role inbox).
function nameFromLocalpart(local) {
  const l = String(local || '').toLowerCase();
  if (ROLE_LOCALPARTS.has(l)) return null;
  const parts = l.split(/[._-]+/).filter((p) => /^[a-z]{2,}$/.test(p));
  if (parts.length < 2 || parts.length > 3) return null;
  return parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(' ');
}

// Scrape a company site for contact emails/phones. Returns contact objects shaped like
// the vendor legs: {name, title, email, phone, linkedin, source:'website'}.
export async function scrapeSiteContacts(domain, { env = process.env, maxPages = 4, maxContacts = 6 } = {}) {
  const host = regHost(domain);
  if (!host) return [];
  const reg = regDomain(host);
  const byEmail = new Map();      // email → contact
  const phones = new Set();
  let pagesFetched = 0;

  for (const path of CONTACT_PATHS) {
    if (pagesFetched >= maxPages || byEmail.size >= maxContacts * 2) break;
    const url = `https://${host}/${path}`.replace(/\/$/, path ? '/' : '');
    let r = null;
    try { r = await fetchText(url, {}, 8000); } catch { r = null; }
    if (!r || !r.ok || !r.body) continue;
    pagesFetched++;
    const html = r.body;

    // mailto: links carry the best signal (a name usually sits in the anchor text).
    for (const { email, label } of mailtosWithContext(html)) {
      if (!email || JUNK_EMAIL_RE.test(email)) continue;
      addEmail(byEmail, email, reg, nameFromLabel(label));
    }
    // Bare text emails (footers often print them as plain text, not a link).
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
    for (const e of (text.match(EMAIL_RE) || [])) {
      const email = e.toLowerCase();
      if (JUNK_EMAIL_RE.test(email)) continue;
      addEmail(byEmail, email, reg, null);
    }
    // Phones from tel: links (loose text phones are too noisy to trust).
    const telRe = /href=["']tel:([^"']+)["']/gi; let tm;
    while ((tm = telRe.exec(html)) && phones.size < 4) {
      const p = tm[1].replace(/[^\d+]/g, '');
      if (p.replace(/\D/g, '').length >= 7) phones.add(tm[1].trim());
    }
  }

  // Rank: on-domain emails first, named people before role inboxes.
  const contacts = [...byEmail.values()]
    .sort((a, b) => (Number(b.onDomain) - Number(a.onDomain)) || (Number(!!b.name) - Number(!!a.name)));
  const firstPhone = [...phones][0] || null;
  const out = [];
  for (const c of contacts) {
    if (out.length >= maxContacts) break;
    out.push({
      name: c.name || regHost(host),
      title: c.name ? null : (c.role ? 'Company inbox' : 'Contact'),
      email: c.email,
      phone: out.length === 0 ? firstPhone : null,   // attach the one phone to the top contact
      linkedin: null,
      source: 'website',
    });
  }
  return out;
}

function addEmail(map, email, reg, nameHint) {
  if (map.has(email)) { if (nameHint && !map.get(email).name) map.get(email).name = nameHint; return; }
  const [local, dom] = email.split('@');
  const onDomain = regDomain(dom) === reg;
  const role = ROLE_LOCALPARTS.has(String(local || '').toLowerCase());
  const name = nameHint || nameFromLocalpart(local);
  map.set(email, { email, local, onDomain, role, name });
}
