// Inbound-lead enrichment API.
//
//   POST  (x-internal-secret header, NO session — called by Zapier on a new form
//         submission) → upsert the lead, kick the async enrichment, and return the
//         DETERMINISTIC dossier URL so Zapier can drop it into the internal
//         notification. The URL is stable (keyed on the email), so Zapier doesn't
//         wait for enrichment — by review time the dossier has populated itself.
//   GET   ?key=<leadKey>  (session-gated by the `leads` permission) → {lead} for
//         the dossier page to render + poll.
//   GET   ?list=1&q=      → recent leads (gated).
//
// The person deep-dive + Apollo firmographics run past the 60s API cap, so they
// run in the runLead Inngest fn; POST returns immediately.

import { requirePermission, userCan } from '../lib/auth.js';
import { isDbConfigured } from '../lib/db/supabase.js';
import { inngest, LEAD_REQUESTED, RUN_REQUESTED } from '../lib/inngest/client.js';
import { leadKey } from '../lib/leads/key.js';
import { upsertLead, getLeadByKey, listLeads } from '../lib/db/leads.js';
import { listRuns, createRun } from '../lib/db/runs.js';
import { listUsers } from '../lib/db/users.js';
import { createNotification } from '../lib/db/notifications.js';
import { sendEmail, isEmailConfigured } from '../lib/email.js';
import { cleanDomainInput } from '../lib/util.js';
import { trackDomain } from '../lib/domainscout.js';
import { emailDomain, isFreeEmail } from '../lib/leads/triage.js';

// Has a Domain Owner report already been run for a domain? Return the newest
// completed (or report-bearing errored) run so the dossier can deep-link to it.
async function reportForDomain(domain) {
  if (!domain || !/\./.test(domain)) return null;
  try {
    const runs = await listRuns({ q: domain, limit: 10, statuses: ['done'], reportStatuses: ['error'] });
    const hit = runs.find((r) => String(r.domain).toLowerCase() === domain);
    return hit ? { id: hit.id, domain: hit.domain, created_at: hit.created_at } : null;
  } catch { return null; }
}

// One report link per inquired domain (an inquiry can name several — "swerve.com,
// swerve.ai"). Returns the reports that exist, in the order the domains were listed.
async function existingReports(domainRaw) {
  const domains = parseDomains(domainRaw);
  const found = await Promise.all(domains.map((d) => reportForDomain(d)));
  return found.filter(Boolean);
}

export const config = { maxDuration: 30 };

const SECRET = process.env.RESEARCH_INTERNAL_SECRET || '';

function leadUrl(key) {
  const base = (process.env.APP_URL || 'https://app.snagged.com/research').replace(/\/+$/, '');
  return `${base}/#/lead/${key}`;
}

// Pull the fields off a Formspark/Zapier POST — tolerant of a few label spellings
// (the form field names vary), so the same endpoint works if the form changes.
function readForm(b) {
  const pick = (...keys) => {
    for (const k of keys) {
      if (b[k] != null && String(b[k]).trim() !== '') return String(b[k]).trim();
    }
    return null;
  };
  return {
    first_name: pick('first_name', 'First Name', 'firstName'),
    last_name: pick('last_name', 'Last Name', 'lastName'),
    name: pick('name', 'Name', 'full_name'),
    email: pick('email', 'Email', 'Email Address', 'email_address'),
    linkedin_url: pick('linkedin_url', 'LinkedIn', 'linkedin'),
    location: pick('location', 'Location'),
    domain_of_interest: pick('domain_of_interest', 'domain', 'Domain Name S Of Interest', 'domains', 'Domains'),
    intent: pick('intent', 'i_want_to', 'I Want To', 'Acquire or Sell'),
    budget: pick('budget', 'Budget'),
    message: pick('message', 'Message'),
    owner_outreach: pick('owner_outreach', 'Owner Outreach', 'Owner Contact'),
  };
}

// Split a raw "domain(s) of interest" field into every distinct valid domain. An
// inquiry often lists MORE THAN ONE name ("swerve.com, swerve.ai" / "a.com and b.io")
// — each should get its own free report. Tokenized on commas / whitespace / and / slashes
// (cleanDomainInput strips whitespace, so an un-split multi-domain string is invalid and
// would silently kick nothing). Deduped, order preserved.
function parseDomains(raw) {
  const out = [];
  const seen = new Set();
  for (const tok of String(raw || '').split(/[,;|/\s]+|\band\b/i)) {
    if (!tok || !tok.includes('.')) continue;
    let d;
    try { d = cleanDomainInput(tok); } catch { continue; } // not a valid domain → skip this token
    if (seen.has(d)) continue;
    seen.add(d);
    out.push(d);
  }
  return out;
}

// Pre-warm the FREE Domain Owner report for an inquired domain the moment a lead
// lands — so by the time a human reviews, the free pre-flight is already done (no
// 5-minute wait) and the dossier's "Ownership report on file" banner is live. Kicks
// the same shallow research pipeline as the Research tab, deduped (skips if a run
// already exists / is in flight) and fully best-effort — never blocks the lead.
async function kickFreeReport(domain) {
  if (!domain) return;
  try {
    const runs = await listRuns({ q: domain, limit: 10, statuses: ['queued', 'running', 'done'], reportStatuses: ['error'] });
    if (runs.some((r) => String(r.domain).toLowerCase() === domain)) return; // already have / running
    try { await trackDomain(domain, process.env); } catch { /* non-blocking */ }
    const runId = await createRun({ domain });
    await inngest.send({ name: RUN_REQUESTED, data: { runId, domain, phase: 'shallow' } });
  } catch { /* best-effort — a failed pre-warm never affects the lead */ }
}

// Kick a free report for EVERY domain named in the inquiry (parsed + deduped).
async function kickFreeReports(domainRaw) {
  for (const domain of parseDomains(domainRaw)) await kickFreeReport(domain);
}

// Buy-side unless the intent CLEARLY says sell (and not acquire). Mirrors the admin
// Buy-Side Inquiries queue's looksBuySide so the notification matches what's triaged.
function looksBuySide(intent) {
  const s = String(intent || '').toLowerCase();
  if (!s) return true;
  if (/\bsell\b|selling|list|apprais/.test(s) && !/acqui|buy|purchas/.test(s)) return false;
  return true;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// A new buy-side inquiry landed → ping everyone who can triage it (the `pipedrive`
// module permission that gates Deals → Buy-Side Inquiries, plus admins). Bell + email,
// best-effort, deep-linked to the dossier. Fires only for NEW leads (see handlePost).
async function notifyTriageOfInquiry({ key, name, email, domainRaw, intent, budget }) {
  try {
    const users = await listUsers();
    const triagers = (users || []).filter((u) => u && (userCan(u, 'admin') || userCan(u, 'pipedrive')));
    if (!triagers.length) return;
    const who = name || email || 'Someone';
    const domains = parseDomains(domainRaw);
    const domainLabel = domains.length ? domains.join(', ') : (domainRaw || '—');
    const title = `New buy-side inquiry — ${who}`;
    const bits = [domainLabel && `Domain: ${domainLabel}`, budget && `Budget: ${budget}`, intent && `Intent: ${intent}`].filter(Boolean).join(' · ');
    const link = `/research/#/lead/${key}`;
    const emailOn = isEmailConfigured();
    const dossier = leadUrl(key);
    await Promise.allSettled(
      triagers.flatMap((u) => {
        const jobs = [createNotification({ user_id: u.id, kind: 'inquiry', title, body: bits || 'Review in Buy-Side Inquiries.', link })];
        if (emailOn) {
          jobs.push(sendEmail({
            to: u.email,
            subject: `🟢 ${title}`,
            text: `${who} submitted a buy-side inquiry.\n\n${bits}\n\nReview it: ${dossier}`,
            html: `<p><strong>${esc(who)}</strong> submitted a buy-side inquiry.</p>`
              + (bits ? `<p style="color:#4a5b66">${esc(bits)}</p>` : '')
              + `<p><a href="${esc(dossier)}" style="display:inline-block;padding:10px 16px;background:#e48069;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Review inquiry</a></p>`,
          }));
        }
        return jobs;
      }),
    );
  } catch (e) {
    console.error('notifyTriageOfInquiry failed:', e && e.message);
  }
}

async function handlePost(req, res) {
  // Machine-to-machine auth — a shared secret header, NOT a session (Zapier has no
  // cookie). If the secret is unset we refuse rather than run open.
  if (!SECRET || req.headers['x-internal-secret'] !== SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const form = readForm(body);
  const email = (form.email || '').toLowerCase();
  if (!email || !/@/.test(email)) {
    res.status(400).json({ error: 'A valid email is required.' });
    return;
  }
  const key = leadKey(email);
  const name = [form.first_name, form.last_name].filter(Boolean).join(' ').trim() || form.name || null;
  const companyDomain = isFreeEmail(email) ? null : emailDomain(email);

  if (isDbConfigured()) {
    // Is this the first time we've seen this lead? Only NEW inquiries notify triage
    // (a re-submission / enrichment re-run must not re-ping everyone).
    let isNew = true;
    try { isNew = !(await getLeadByKey(key)); } catch { /* treat as new */ }
    await upsertLead({
      lead_key: key, email, name,
      company_domain: companyDomain,
      domain_of_interest: form.domain_of_interest,
      intent: form.intent, budget: form.budget, form,
    });
    // Fire-and-forget the enrichment; the deterministic URL is returned NOW.
    try { await inngest.send({ name: LEAD_REQUESTED, data: { lead_key: key } }); } catch { /* best-effort */ }
    // Pre-warm the free Domain Owner report for EVERY inquired domain, so they're
    // already run by the time a human reviews the lead (no 5-minute wait).
    if (form.domain_of_interest) await kickFreeReports(form.domain_of_interest);
    // Ping the triage team about a NEW buy-side inquiry (bell + email), best-effort.
    if (isNew && looksBuySide(form.intent)) {
      await notifyTriageOfInquiry({ key, name, email, domainRaw: form.domain_of_interest, intent: form.intent, budget: form.budget });
    }
  }
  res.status(200).json({ ok: true, key, url: leadUrl(key) });
}

async function handleGet(req, res) {
  const user = await requirePermission(req, res, 'leads');
  if (!user) return;
  if (req.query.list != null) {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    res.status(200).json({ leads: await listLeads({ q, limit }) });
    return;
  }
  const key = String(req.query.key || '').trim();
  if (!key) { res.status(400).json({ error: 'Missing key' }); return; }
  const lead = await getLeadByKey(key);
  if (!lead) { res.status(404).json({ error: 'Lead not found' }); return; }
  const report_runs = await existingReports(lead.domain_of_interest);
  res.status(200).json({ lead, report_run: report_runs[0] || null, report_runs });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') return await handlePost(req, res);
    if (req.method === 'GET') return await handleGet(req, res);
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
