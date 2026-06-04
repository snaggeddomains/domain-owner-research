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

async function tool(name, args, env) {
  try { const r = await runTool(name, args, env); return r && r.ok ? r.data : null; } catch { return null; }
}

export async function freeSweep(domains, { env = process.env } = {}) {
  const list = [...new Set((domains || []).map((d) => String(d || '').trim().toLowerCase()).filter(Boolean))].slice(0, MAX);
  return Promise.all(list.map((domain) => sweepOne(domain, env)));
}

async function sweepOne(domain, env) {
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

  return { domain, internalOwner, registrant, cluster, site, listed, dns: { mx, a } };
}
