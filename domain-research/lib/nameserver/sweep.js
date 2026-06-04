// Nameserver Search — free owner SWEEP.
//
// "Run free owner lookup" beyond bare WHOIS: for each selected domain, hit the
// FREE data endpoints in parallel and aggregate every owner signal we can get
// for free (no credits, no LLM):
//   • universe_ownership / masterlist_lookup — do WE already know the owner?
//   • whois_lookup + rdap_whois            — public registrant (name/org/email)
//   • registration_cluster                 — same-label siblings registered together
//   • livesite_inspect                     — company/emails/socials from the live site
//   • marketplace_check                    — listed for sale + which platform
//   • dns_lookup                           — MX/host (email & hosting provider)
//
// Wayback + paid people-enrichment are intentionally left to the full report
// (the per-domain drill-down) — this sweep stays fast. Capped fan-out; every
// source is best-effort so one failure never sinks the row.
import { runTool } from '../sources/index.js';
import { rdapRegistrant } from './owner.js';

const MAX = 6;

// Free email providers — an email-DOMAIN match on these is meaningless (everyone
// uses gmail), so only flag exact-email matches there, not domain matches.
const GENERIC_EMAIL = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'aol.com', 'icloud.com',
  'me.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com', 'yandex.com', 'yandex.ru', 'qq.com', '163.com',
]);

async function tool(name, args, env) {
  try { const r = await runTool(name, args, env); return r && r.ok ? r.data : null; } catch { return null; }
}

// Cross-match a swept domain's contacts against the linked report's known people.
// Returns the strongest signals: exact shared email > shared (non-generic) email
// domain > shared registrant name. This is the hard triangulation confirmation.
function ownerMatches(reg, site, context) {
  if (!context) return [];
  const reportEmails = new Set();
  const reportDomains = new Set((context.emailDomains || []).filter((d) => d && !GENERIC_EMAIL.has(d)));
  const reportNames = [];
  for (const p of (context.people || [])) {
    const t = String(p.type || '').toLowerCase();
    const v = String(p.value || '').trim().toLowerCase();
    if (!v) continue;
    if (t === 'email' && v.includes('@')) {
      reportEmails.add(v);
      const dom = v.split('@')[1];
      if (dom && !GENERIC_EMAIL.has(dom)) reportDomains.add(dom);
    } else if (t === 'name' && v.length >= 5 && !/^https?:|\//.test(v)) {
      reportNames.push(v);
    }
  }
  if (context.owner && String(context.owner).length >= 5) reportNames.push(String(context.owner).toLowerCase());

  const emails = new Set();
  if (reg.email) emails.add(String(reg.email).toLowerCase());
  for (const e of (site && site.emails) || []) emails.add(String(e).toLowerCase());

  const out = [];
  for (const e of emails) {
    if (reportEmails.has(e)) { out.push({ kind: 'email', detail: e }); continue; }
    const dom = e.split('@')[1];
    if (dom && reportDomains.has(dom)) out.push({ kind: 'email_domain', detail: '@' + dom });
  }
  const hay = [reg.name, reg.organization, site && site.title].filter(Boolean).join(' ').toLowerCase();
  if (hay) {
    for (const nm of reportNames) { if (hay.includes(nm)) { out.push({ kind: 'name', detail: nm }); break; } }
  }
  const seen = new Set();
  return out.filter((m) => { const k = `${m.kind}|${m.detail}`; return seen.has(k) ? false : seen.add(k); });
}

export async function freeSweep(domains, { env = process.env, context = null } = {}) {
  const list = [...new Set((domains || []).map((d) => String(d || '').trim().toLowerCase()).filter(Boolean))].slice(0, MAX);
  return Promise.all(list.map((domain) => sweepOne(domain, env, context)));
}

async function sweepOne(domain, env, context) {
  const [uni, mas, w, rd, cl, live, mkt, dnsr] = await Promise.all([
    tool('universe_ownership', { domain }, env),
    tool('masterlist_lookup', { domain }, env),
    tool('whois_lookup', { domain }, env),
    tool('rdap_whois', { domain }, env),
    tool('registration_cluster', { domain }, env),
    tool('livesite_inspect', { domain }, env),
    tool('marketplace_check', { domain }, env),
    tool('dns_lookup', { domain }, env),
  ]);

  const internalOwner =
    (uni && uni.found && uni.owner) ||
    (mas && mas.found && mas.owner) || null;

  const reg = (w && w.registrant) || {};
  const r = rd ? rdapRegistrant(rd) : {};
  const registrant = {
    name: reg.name || r.name || null,
    organization: reg.organization || r.organization || null,
    email: reg.email || r.email || null,
    phone: reg.phone || null,
    registrar: (w && w.registrar) || r.registrar || null,
    privacy: !!(w && w.privacy) && !(reg.name || reg.organization || r.name || r.organization),
  };

  const cluster = (cl && Array.isArray(cl.cluster) ? cl.cluster : []).map((s) => ({
    domain: s.domain,
    created: s.created || null,
    registrant: s.registrant_name || s.registrant_org || null,
    email: s.registrant_email || null,
    shares_ns: !!s.shares_nameserver,
    days: s.days_from_target == null ? null : s.days_from_target,
  }));

  const site = live && live.reachable ? {
    title: live.title || null,
    emails: (live.emails || []).slice(0, 8),
    socials: (live.social_links || []).slice(0, 8),
    copyright: live.copyright || null,
    parked: !!(live.parking && live.parking.likely_parked),
  } : null;

  const listedChannels = (mkt && Array.isArray(mkt.channels) ? mkt.channels : [])
    .filter((c) => c.listed).map((c) => ({ channel: c.channel, url: c.url || null }));
  const listed = mkt ? { any: !!mkt.any_listed, channels: listedChannels } : null;

  const mx = (dnsr && Array.isArray(dnsr.mx) ? dnsr.mx : [])
    .map((m) => (typeof m === 'string' ? m : m && m.exchange)).filter(Boolean).slice(0, 4);
  const a = (dnsr && Array.isArray(dnsr.a) ? dnsr.a : []).slice(0, 4);

  const matches = ownerMatches(registrant, site, context);

  return { domain, internalOwner, registrant, cluster, site, listed, dns: { mx, a }, matches };
}
