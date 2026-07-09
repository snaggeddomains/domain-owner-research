// Person deep-dive — deterministic pipeline. From a social-profile URL:
//   1. IDENTIFY — fetch the profile (read_url, Scrape.do for bot-walls) + a name
//      search → name, current title, employer, LinkedIn URL, location.
//   2. TRIANGULATE / VIP — find the same person across X/LinkedIn/Quora/Facebook/
//      Instagram/YouTube/GitHub/Crunchbase/Wikipedia, read follower/subscriber
//      counts where public, and roll up a prominence (VIP) band + the signals.
//   3. FREE CONTEXT — rocketreach_search (FREE, no emails) for professional context.
//   4. SYNTHESIZE — one LLM pass writes the dossier narrative.
// The PAID contact reveal (rocketreach_lookup + fullenrich) is a separate step
// (revealContacts) triggered by an explicit user click, not this pipeline.
//
// Everything is best-effort + fail-open — a blocked profile or a dead search never
// aborts the run; the dossier just carries whatever resolved.
import Anthropic from '@anthropic-ai/sdk';
import { runTool } from '../sources/index.js';
import { recordModelUsage } from '../db/usage.js';

// ---- platforms + follower parsing -----------------------------------------

const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', host: /(^|\.)linkedin\.com$/i, unit: /([\d.,]+[KMB+]*)\s*(followers|connections)/i },
  { key: 'twitter', label: 'X / Twitter', host: /(^|\.)(twitter|x)\.com$/i, unit: /([\d.,]+[KMB]*)\s*Followers/i },
  { key: 'facebook', label: 'Facebook', host: /(^|\.)facebook\.com$/i, unit: /([\d.,]+[KMB]*)\s*(followers|likes)/i },
  { key: 'instagram', label: 'Instagram', host: /(^|\.)instagram\.com$/i, unit: /([\d.,]+[KMB]*)\s*Followers/i },
  { key: 'quora', label: 'Quora', host: /(^|\.)quora\.com$/i, unit: /([\d.,]+[KMB]*)\s*followers/i },
  { key: 'youtube', label: 'YouTube', host: /(^|\.)(youtube\.com|youtu\.be)$/i, unit: /([\d.,]+[KMB]*)\s*subscribers/i },
  { key: 'tiktok', label: 'TikTok', host: /(^|\.)tiktok\.com$/i, unit: /([\d.,]+[KMB]*)\s*Followers/i },
  { key: 'github', label: 'GitHub', host: /(^|\.)github\.com$/i, unit: /([\d.,]+[KMB]?)\s*followers/i },
  { key: 'crunchbase', label: 'Crunchbase', host: /(^|\.)crunchbase\.com$/i },
  { key: 'wikipedia', label: 'Wikipedia', host: /(^|\.)wikipedia\.org$/i },
];

function hostOf(url) {
  try { return new URL(url).host.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}
function platformOf(url) {
  const h = hostOf(url);
  if (!h) return null;
  return PLATFORMS.find((p) => p.host.test(h)) || null;
}

// "1.2K" → 1200, "3.4M" → 3_400_000, "12,345" → 12345, "500+" → 500.
function parseCount(raw) {
  if (!raw) return null;
  const m = String(raw).replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] || 1;
  return Math.round(n * mult);
}
function fmtCount(n) {
  if (!(n > 0)) return null;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return String(n);
}

function parseJsonLoose(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { /* try slice */ }
  const a = cleaned.indexOf('{'); const b = cleaned.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(cleaned.slice(a, b + 1)); } catch { /* give up */ } }
  return null;
}

// ---- small tool wrappers (all fail-open) ----------------------------------

async function readUrl(url, env) {
  const r = await runTool('read_url', { url }, env).catch(() => null);
  return r && r.ok ? r.data : null;
}
async function webSearch(query, site, env) {
  const r = await runTool('web_search', site ? { query, site } : { query }, env).catch(() => null);
  return r && r.ok ? r.data : null;
}
async function rocketSearch(args, env) {
  const r = await runTool('rocketreach_search', args, env).catch(() => null);
  if (!r || !r.ok) return [];
  const d = r.data || {};
  const arr = d.profiles || d.results || d.data || [];
  return Array.isArray(arr) ? arr : [];
}

// Extract a follower/subscriber count for a platform from fetched page text +
// title. Returns { count, raw } or null. Uses the platform's unit regex over the
// og-ish text (read_url already flattens HTML → text).
function followersFrom(platform, page) {
  if (!platform || !platform.unit || !page) return null;
  const hay = `${page.title || ''} \n ${page.text || ''}`.slice(0, 4000);
  const m = hay.match(platform.unit);
  if (!m) return null;
  const count = parseCount(m[1]);
  return count ? { count, raw: m[1] } : null;
}

// ---- step 1: identify ------------------------------------------------------

function nameFromTitle(title) {
  if (!title) return null;
  const s = String(title);
  // Common shapes: "Jane Doe - CEO at Acme | LinkedIn", "Jane Doe (@jane) / X",
  // "torvalds (Linus Torvalds) · GitHub". Take the segment before the first
  // separator; but prefer a parenthetical REAL name (multi-word, no @) when the
  // lead segment is just a bare handle (GitHub-style "handle (Real Name)").
  let t = s.split(/\s*[|–—\-\/(]\s*|\s*[·•]\s*/)[0].trim();
  t = t.replace(/\s*(\/ X|on LinkedIn|LinkedIn|Twitter|Facebook|Instagram|Quora|YouTube|GitHub)\s*$/i, '').trim();
  const paren = s.match(/\(([^)@]{3,40})\)/);
  if (paren && /\s/.test(paren[1].trim()) && !/\s/.test(t)) t = paren[1].trim();
  if (t.length < 2 || t.length > 60 || /[@#]/.test(t)) return null;
  return t;
}

async function identify({ url, name, company, env }) {
  const platform = platformOf(url);
  const inputPage = await readUrl(url, env);
  const subject = {
    name: name || null,
    title: null,
    company: company || null,
    company_domain: null,
    linkedin_url: platform && platform.key === 'linkedin' ? url : null,
    location: null,
    input_url: url,
    input_platform: platform ? platform.key : 'other',
  };
  if (!subject.name && inputPage) subject.name = nameFromTitle(inputPage.title, platform && platform.key);

  // RocketReach search (FREE) — the authoritative professional anchor. Prefer the
  // LinkedIn URL; else name (+company). Fills title/employer/linkedin/location.
  const rrArgs = subject.linkedin_url ? { linkedin_url: subject.linkedin_url }
    : subject.name ? { name: subject.name, ...(subject.company ? { company: subject.company } : {}) }
      : null;
  let rrProfile = null;
  if (rrArgs) {
    const profiles = await rocketSearch(rrArgs, env);
    rrProfile = profiles[0] || null;
    if (rrProfile) {
      subject.name = subject.name || rrProfile.name || null;
      subject.title = rrProfile.current_title || subject.title;
      subject.company = subject.company || rrProfile.current_employer || null;
      subject.linkedin_url = subject.linkedin_url || rrProfile.linkedin_url || null;
      subject.location = rrProfile.location || subject.location;
    }
  }
  return { subject, inputPage, rrProfile };
}

// ---- step 2: triangulate + VIP --------------------------------------------

async function triangulate({ subject, inputPage, env }) {
  const found = new Map(); // platformKey -> { platform, url, followers, raw }
  const record = (url, page) => {
    const p = platformOf(url);
    if (!p || found.has(p.key)) return;
    const f = page ? followersFrom(p, page) : null;
    found.set(p.key, { key: p.key, label: p.label, url, followers: f ? f.count : null, followers_raw: f ? f.raw : null });
  };
  // The input profile itself.
  record(subject.input_url, inputPage);

  // A broad name search harvests platform links + the knowledge graph in one call.
  const q = [subject.name, subject.company].filter(Boolean).join(' ');
  let knowledge = null;
  if (q) {
    const broad = await webSearch(q, null, env);
    knowledge = broad && broad.knowledge_graph ? broad.knowledge_graph : null;
    for (const r of (broad && broad.results) || []) record(r.link, null);
    // pull any social links surfaced in the input page too
    for (const l of (inputPage && inputPage.social_links) || []) record(l, null);
  }

  // Targeted per-platform search for the ones we haven't placed yet (cheap Serper
  // calls; capped). Then read_url each newly-found profile to read follower counts.
  const wanted = PLATFORMS.filter((p) => p.unit || p.key === 'crunchbase' || p.key === 'wikipedia');
  for (const p of wanted) {
    if (found.has(p.key) || !q) continue;
    const site = { linkedin: 'linkedin.com', twitter: 'x.com', facebook: 'facebook.com', instagram: 'instagram.com', quora: 'quora.com', youtube: 'youtube.com', tiktok: 'tiktok.com', github: 'github.com', crunchbase: 'crunchbase.com', wikipedia: 'wikipedia.org' }[p.key];
    const sr = await webSearch(`"${subject.name}"${subject.company ? ` ${subject.company}` : ''}`, site, env);
    const hit = ((sr && sr.results) || []).find((r) => platformOf(r.link)?.key === p.key);
    if (hit) record(hit.link, null);
  }

  // Read follower counts for placed profiles that don't have one yet (bounded).
  const social = [...found.values()];
  const toRead = social.filter((s) => s.followers == null && PLATFORMS.find((p) => p.key === s.key)?.unit).slice(0, 6);
  await Promise.all(toRead.map(async (s) => {
    const page = await readUrl(s.url, env);
    const p = PLATFORMS.find((x) => x.key === s.key);
    const f = followersFrom(p, page);
    if (f) { s.followers = f.count; s.followers_raw = f.raw; }
  }));

  const maxFollowers = social.reduce((m, s) => Math.max(m, s.followers || 0), 0);
  const presenceCount = social.length;
  const hasWiki = social.some((s) => s.key === 'wikipedia');
  const hasKG = !!knowledge;
  const seniorTitle = /\b(founder|ceo|cto|cfo|coo|cmo|president|chief|partner|vp|head of|director|owner)\b/i.test(subject.title || '');

  // VIP band — transparent, rule-based. Every signal that fired is listed.
  const signals = [];
  let score = 0;
  if (maxFollowers >= 1e6) { score += 4; signals.push(`${fmtCount(maxFollowers)}+ followers (massive audience)`); }
  else if (maxFollowers >= 1e5) { score += 3; signals.push(`${fmtCount(maxFollowers)} followers (large audience)`); }
  else if (maxFollowers >= 1e4) { score += 2; signals.push(`${fmtCount(maxFollowers)} followers (sizable audience)`); }
  else if (maxFollowers >= 1e3) { score += 1; signals.push(`${fmtCount(maxFollowers)} followers`); }
  if (presenceCount >= 5) { score += 2; signals.push(`present on ${presenceCount} platforms`); }
  else if (presenceCount >= 3) { score += 1; signals.push(`present on ${presenceCount} platforms`); }
  if (hasWiki) { score += 2; signals.push('has a Wikipedia page'); }
  if (hasKG) { score += 1; signals.push('appears in Google knowledge panel'); }
  if (seniorTitle) { score += 1; signals.push(`senior role (${subject.title})`); }
  const band = score >= 6 ? 'vip' : score >= 4 ? 'high_profile' : score >= 2 ? 'notable' : 'low';

  // sort social: biggest audience first, then known-count, then alpha
  social.sort((a, b) => (b.followers || 0) - (a.followers || 0) || a.label.localeCompare(b.label));
  return {
    social, presence_count: presenceCount, max_followers: maxFollowers,
    knowledge_graph: knowledge, vip: { band, score, signals },
  };
}

// ---- step 4: synthesize ----------------------------------------------------

const SYNTH_SYSTEM = `You are a research analyst producing a concise, factual dossier on ONE person from the signals provided. Rules:
- Use ONLY the provided signals — never invent facts, employers, or numbers. If something is unknown, say so or omit it.
- Be direct and specific. No filler.
- "reach_recommendation" = the best way to reach this person given what's known (their most-active platform, whether they're senior/gate-kept, whether to go direct vs via their company). Do NOT fabricate contact details — those come from a separate paid lookup.
Return STRICT JSON only:
{"summary": "2-3 sentence who-they-are", "current_role": "title @ company or null", "prominence": "1-2 sentences on their public profile / audience / VIP read", "notable": ["short factual finding", ...], "reach_recommendation": "1-2 sentences"}`;

function synthContext({ subject, triangulation, rrProfile, inputPage }) {
  const lines = [];
  lines.push(`INPUT URL: ${subject.input_url} (${subject.input_platform})`);
  lines.push(`NAME: ${subject.name || 'unknown'}`);
  lines.push(`TITLE: ${subject.title || 'unknown'}`);
  lines.push(`COMPANY: ${subject.company || 'unknown'}`);
  lines.push(`LOCATION: ${subject.location || 'unknown'}`);
  if (subject.linkedin_url) lines.push(`LINKEDIN: ${subject.linkedin_url}`);
  lines.push('');
  lines.push(`VIP BAND: ${triangulation.vip.band} — signals: ${triangulation.vip.signals.join('; ') || 'none'}`);
  lines.push('CROSS-PLATFORM PRESENCE:');
  for (const s of triangulation.social) lines.push(`  - ${s.label}: ${s.url}${s.followers ? ` (${fmtCount(s.followers)} followers)` : ''}`);
  if (triangulation.knowledge_graph) lines.push(`KNOWLEDGE PANEL: ${JSON.stringify(triangulation.knowledge_graph).slice(0, 600)}`);
  if (rrProfile) lines.push(`ROCKETREACH: ${rrProfile.current_title || ''} @ ${rrProfile.current_employer || ''} — ${rrProfile.location || ''}`);
  if (inputPage && inputPage.text) lines.push(`PROFILE PAGE EXCERPT: ${String(inputPage.text).slice(0, 800)}`);
  return lines.join('\n');
}

async function synthesize(parts, env) {
  const fallback = {
    summary: [parts.subject.name, parts.subject.title && `— ${parts.subject.title}`, parts.subject.company && `at ${parts.subject.company}`].filter(Boolean).join(' ') || 'Identity not resolved from the provided URL.',
    current_role: parts.subject.title ? `${parts.subject.title}${parts.subject.company ? ` @ ${parts.subject.company}` : ''}` : null,
    prominence: `VIP read: ${parts.triangulation.vip.band}. ${parts.triangulation.vip.signals.join('; ') || 'Limited public footprint found.'}`,
    notable: [],
    reach_recommendation: parts.triangulation.social[0] ? `Most visible on ${parts.triangulation.social[0].label}.` : 'Try LinkedIn or the paid contact reveal.',
  };
  if (!env.ANTHROPIC_API_KEY) return { ...fallback, model: null };
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 18000, maxRetries: 1 });
    const model = env.PERSON_MODEL || env.OUTREACH_MODEL || 'claude-sonnet-4-6';
    const resp = await client.messages.create({
      model,
      max_tokens: 900,
      system: [{ type: 'text', text: SYNTH_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `${synthContext(parts)}\n\nWrite the dossier now. Strict JSON only.` }],
    });
    recordModelUsage('anthropic', model, resp.usage);
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const parsed = parseJsonLoose(text);
    return parsed ? { ...fallback, ...parsed, model } : { ...fallback, model };
  } catch { return { ...fallback, model: null }; }
}

// ---- public: the free deep dive -------------------------------------------

export async function runPersonDeepDive({ url, name, company, env = process.env }) {
  const { subject, inputPage, rrProfile } = await identify({ url, name, company, env });
  const triangulation = await triangulate({ subject, inputPage, env });
  const narrative = await synthesize({ subject, triangulation, rrProfile, inputPage }, env);
  return {
    subject,
    social: triangulation.social,
    presence_count: triangulation.presence_count,
    max_followers: triangulation.max_followers,
    knowledge_graph: triangulation.knowledge_graph || null,
    vip: triangulation.vip,
    narrative,
    // Free professional context (no emails/phones).
    professional: rrProfile ? {
      title: rrProfile.current_title || null, employer: rrProfile.current_employer || null,
      linkedin_url: rrProfile.linkedin_url || subject.linkedin_url || null, location: rrProfile.location || null,
      source: 'rocketreach_search',
    } : null,
  };
}

// ---- public: the PAID contact reveal --------------------------------------

// Resolve emails/phones for an already-identified subject. RocketReach lookup
// first (by LinkedIn URL / id / name+company), FullEnrich as the fallback when
// RocketReach yields nothing. Bounded — fits the 60s sync API cap.
export async function revealContacts({ subject, includePhone = false, env = process.env }) {
  const out = { emails: [], phones: [], sources: [] };
  const s = subject || {};

  // (1) RocketReach lookup (paid, 1 credit). Prefer LinkedIn URL.
  let rrArgs = null;
  if (s.linkedin_url) rrArgs = { linkedin_url: s.linkedin_url };
  else if (s.name) rrArgs = { name: s.name, ...(s.company ? { company: s.company } : {}) };
  if (rrArgs) {
    const rr = await runTool('rocketreach_lookup', rrArgs, env).catch(() => null);
    if (rr && rr.ok && rr.data && rr.data.found) {
      for (const e of rr.data.emails || []) out.emails.push({ value: typeof e === 'string' ? e : (e.email || e.value), source: 'rocketreach' });
      for (const p of rr.data.phones || []) out.phones.push({ value: typeof p === 'string' ? p : (p.number || p.value), source: 'rocketreach' });
      out.sources.push('rocketreach_lookup');
      if (rr.data.current_title && !s.title) s.title = rr.data.current_title;
    }
  }

  // (2) FullEnrich fallback (paid) — only when RocketReach found no email.
  if (!out.emails.length && (s.name || (s.first_name && s.last_name))) {
    const feArgs = {
      name: s.name || undefined, first_name: s.first_name || undefined, last_name: s.last_name || undefined,
      linkedin_url: s.linkedin_url || undefined, company: s.company || undefined, domain: s.company_domain || undefined,
      include_phone: !!includePhone,
    };
    if (feArgs.linkedin_url || feArgs.company || feArgs.domain) {
      const fe = await runTool('fullenrich_lookup', feArgs, env).catch(() => null);
      if (fe && fe.ok && fe.data && fe.data.found) {
        for (const e of fe.data.emails || []) out.emails.push({ value: e.email || e.value || e, status: e.status, source: 'fullenrich' });
        if (fe.data.work_email) out.emails.push({ value: fe.data.work_email, label: 'work', source: 'fullenrich' });
        if (fe.data.personal_email) out.emails.push({ value: fe.data.personal_email, label: 'personal', source: 'fullenrich' });
        for (const p of fe.data.phones || []) out.phones.push({ value: p.number || p.value || p, source: 'fullenrich' });
        if (fe.data.phone) out.phones.push({ value: fe.data.phone, source: 'fullenrich' });
        out.sources.push('fullenrich_lookup');
      }
    }
  }

  // de-dupe by value
  const dedupe = (arr) => {
    const seen = new Set(); const r = [];
    for (const x of arr) { const v = String(x.value || '').trim().toLowerCase(); if (!v || seen.has(v)) continue; seen.add(v); r.push(x); }
    return r;
  };
  out.emails = dedupe(out.emails);
  out.phones = dedupe(out.phones);
  out.found = out.emails.length > 0 || out.phones.length > 0;
  return out;
}

export { platformOf, fmtCount, parseCount };
export default { runPersonDeepDive, revealContacts };
