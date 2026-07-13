import { inngest, RUN_REQUESTED, CHAT_REQUESTED, RUN_CANCELLED, SALES_RESEARCH_REQUESTED, SALES_ANGLES_REQUESTED, PORTFOLIO_REQUESTED, PERSON_REQUESTED, LEAD_REQUESTED } from './client.js';
import { gather, critique, chatTurn } from '../agent.js';
import { friendlyApiError } from '../llm/anthropic.js';
import { setRunStatus, saveRunReport, failRun, getRun } from '../db/runs.js';
import { getDomainNotes } from '../db/notes.js';
import { getChat, updateTurn, copyChatToRun } from '../db/chat.js';
import { chatEmailContext } from '../db/chatEmails.js';
import { getUser } from '../db/users.js';
import { createNotification } from '../db/notifications.js';
import { withCategory } from '../db/usage.js';
import { loadLessonsAddendum, bumpAppliedCounts } from '../db/lessons.js';
import { sendEmail, isEmailConfigured } from '../email.js';
import { reportUrl, salesUrl } from '../reportUrl.js';
import { summarizeReport } from '../reportSummary.js';
import { maybeCrackOwner } from '../owner/fallback.js';
import { discoverUpgrade } from '../sales/discovery/upgrade.js';
import { discoverOperators } from '../sales/discovery/operators.js';
import { discoverAngles } from '../sales/discovery/keyword.js';
import { gateRelevance } from '../sales/relevance.js';
import { resolveCandidates } from '../sales/resolve.js';
import {
  setSalesProjectStatus, insertSalesCandidates, getSalesProject, listSalesCandidates,
} from '../db/sales.js';
import {
  getPortfolioRun, setPortfolioRunStatus, insertPortfolioDomains,
} from '../db/portfolio.js';
import { getPersonRun, setPersonRunStatus } from '../db/person.js';
import { runPersonDeepDive } from '../person/orchestrate.js';
import { getLeadByKey, setLeadStatus } from '../db/leads.js';
import { runLeadEnrich } from '../leads/orchestrate.js';
import { deriveRegistrantKeys } from '../portfolio/registrant.js';
import { pullPortfolio } from '../portfolio/providers.js';
import { classifyPremium, wordsNeedingDictionary } from '../portfolio/premium.js';
import { filterDictionaryWords } from '../db/dictionary.js';

// Format the refine-chat history as a single corrections block the agent can
// treat as authoritative. Only the user-assistant pairs that contain actual
// content go in; pending/error rows are skipped so a half-finished turn
// can't poison the regen.
function formatChatCorrections(rows) {
  const useful = (rows || []).filter((m) => m.status !== 'pending' && m.status !== 'error' && m.content);
  if (!useful.length) return '';
  return useful
    .map((m) => `${m.role === 'assistant' ? 'ASSISTANT' : 'USER'}: ${String(m.content).slice(0, 2400)}`)
    .join('\n\n')
    .slice(0, 16000);
}

// HTML-escape user/agent content before interpolating into the HTML email body
// (the JSON likely_owner / summary / contact values come from model output and
// can legitimately contain '<', '&', etc.).
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Build phase-aware ({ subject, headline, bottomLine, nextStepText, nextStepHtml })
// from the parsed report summary. SHALLOW = free pre-flight (encourage the deep
// pass when we didn't pin down the owner); DEEP = paid pass (no further upsell).
function buildEmailCopy({ domain, phase, summary, url }) {
  const deep = phase === 'deep';
  // Wording for the opening line — matches the phase the user opted into.
  const passWord = deep ? 'deep research' : 'free';
  const found = summary && summary.found;
  const owner = summary && summary.likelyOwner;
  const ownerContact = summary && summary.primaryContact && summary.primaryContact.value;
  const conf = summary && summary.confidence;

  // Subject stays simple and consistent across phases so inbox threading shows
  // a single "<domain> Ownership Report" item regardless of free vs deep.
  const subject = `${domain} Ownership Report`;

  // Headline = the outcome line shown prominently in the body. Subject is
  // intentionally generic, so the headline is where we tell the user what we
  // found.
  let headline;
  if (found && owner) {
    headline = `Likely owner: ${owner}${conf ? ` — ${conf} confidence` : ''}.`;
  } else if (found && ownerContact) {
    headline = `Best owner lead: ${ownerContact}${conf ? ` — ${conf} confidence` : ''}.`;
  } else {
    headline = deep
      ? `We could not confidently identify the owner from the paid + free sources we checked.`
      : `We could not confidently identify the owner from the free sources alone.`;
  }

  // One-line nuance below the headline (the model's own plain-English summary,
  // when present, beats anything we could template).
  const bottomLine = summary && summary.summary ? summary.summary : null;

  // Next-step nudge: only the SHALLOW path upsells the deep pass. DEEP just
  // points to the refine-chat for follow-up.
  let nextStepText;
  let nextStepHtml;
  if (!deep) {
    nextStepText = found
      ? `This was the free pre-flight pass. If you need verified email/phone for the owner — or a deeper portfolio + reverse-WHOIS sweep — open the report and hit "Go deeper" to run the paid sources.`
      : `This was the free pre-flight pass — it skips the paid historical-WHOIS / reverse-WHOIS / RocketReach sources that often unmask a privacy-shielded owner. Open the report and hit "Go deeper" to run them.`;
    nextStepHtml = nextStepText;
  } else {
    nextStepText = `Need more? Open the report and use the chat panel to ask follow-ups — it can run targeted lookups against the same sources.`;
    nextStepHtml = nextStepText;
  }

  return { subject, headline, bottomLine, nextStepText, nextStepHtml, passWord };
}

// "Report is ready" notification — only sent to a user who opted in via
// email_notify_on_done. Wrapped in its own step.run so it's durable and a
// transient Resend failure doesn't block the run from being marked done.
async function notifyOwnerIfWanted(runId) {
  const run = await getRun(runId);
  if (!run || !run.user_id) return { sent: false, reason: 'no user' };
  const user = await getUser(run.user_id);
  if (!user || !user.email_notify_on_done) return { sent: false, reason: 'user opted out' };
  if (!isEmailConfigured()) return { sent: false, reason: 'RESEND_API_KEY not set' };

  const url = reportUrl({ domain: run.domain, runId: run.id, createdAt: run.created_at });
  const phase = (run.report && run.report.phase) || 'shallow';
  const summary = summarizeReport(run.report || {});
  const { subject, headline, bottomLine, nextStepText, nextStepHtml, passWord } = buildEmailCopy({
    domain: run.domain,
    phase,
    summary,
    url,
  });

  const opener = `Your ${passWord} domain ownership research on ${run.domain} just finished.`;
  const openerHtml = `Your ${esc(passWord)} domain ownership research on <strong>${esc(run.domain)}</strong> just finished.`;

  const textParts = [opener, headline];
  if (bottomLine) textParts.push(bottomLine);
  textParts.push(`Open the report: ${url}`);
  textParts.push(nextStepText);
  textParts.push(`(You're getting this because "Email me when reports finish" is on. Turn it off in the sidebar to stop.)`);

  const htmlParts = [
    `<p>${openerHtml}</p>`,
    `<p style="font-size:15px;font-weight:600;margin:14px 0 6px">${esc(headline)}</p>`,
  ];
  if (bottomLine) htmlParts.push(`<p style="color:#333;margin:0 0 14px">${esc(bottomLine)}</p>`);
  htmlParts.push(
    `<p><a href="${esc(url)}" style="display:inline-block;padding:10px 16px;background:#e48069;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Open the report</a></p>`,
  );
  htmlParts.push(`<p style="color:#444;font-size:13px;margin-top:14px">${esc(nextStepHtml)}</p>`);
  htmlParts.push(`<p style="color:#666;font-size:12px">If the button doesn't work, paste this URL: ${esc(url)}</p>`);
  htmlParts.push(`<p style="color:#999;font-size:11px">You're getting this because "Email me when reports finish" is on. Turn it off in the sidebar to stop.</p>`);

  await sendEmail({
    to: user.email,
    subject,
    text: textParts.join('\n\n'),
    html: htmlParts.join(''),
  });
  return { sent: true, phase, found: Boolean(summary && summary.found) };
}

// In-app notification (the bell) when a report finishes — created for the run's
// user regardless of the email opt-in, since the bell is the in-platform
// alternative to the email. Deep-links to the report via its hash route.
async function createReportNotification(runId) {
  const run = await getRun(runId);
  if (!run || !run.user_id) return { created: false, reason: 'no user' };
  const u = await getUser(run.user_id);
  if (u && u.notify_in_app === false) return { created: false, reason: 'bell disabled' };
  const phase = (run.report && run.report.phase) || 'shallow';
  // Absolute URL (not a bare #hash) so the link works from BOTH chromes: the
  // research SPA's own bell AND the snagged-admin chrome bell (app.snagged.com/
  // admin/*), where a relative "#/r/…" would just append to the admin URL and
  // never reach the report. The research bell's openNotifLink handles an
  // absolute same-origin URL fine (pushState + route()).
  const link = reportUrl({ domain: run.domain, runId: run.id, createdAt: run.created_at });
  await createNotification({
    user_id: run.user_id,
    kind: 'domain_owner',
    title: `Ownership report ready — ${run.domain}`,
    body: phase === 'deep' ? 'Deep research finished.' : 'Free pre-flight finished.',
    link,
  });
  return { created: true };
}

// Bell + (opt-in) email when a Sales Research run finishes — these runs got slower
// with the operator + relevance LLM passes, so the requester shouldn't have to babysit
// the tab. Notifies the project's creator; best-effort, never blocks the run.
async function createSalesNotification(projectId, { failed = false } = {}) {
  const project = await getSalesProject(projectId);
  if (!project || !project.created_by) return { created: false, reason: 'no user' };
  const u = await getUser(project.created_by);
  const link = salesUrl(projectId);
  let n = null;
  if (!failed) { try { const rows = await listSalesCandidates(projectId); n = Array.isArray(rows) ? rows.length : null; } catch { /* count is optional */ } }

  if (!(u && u.notify_in_app === false)) {
    await createNotification({
      user_id: project.created_by,
      kind: 'sales',
      title: failed ? `Buyer research failed — ${project.seed_domain}` : `Buyer research ready — ${project.seed_domain}`,
      body: failed ? 'The run hit an error — open it to retry.' : (n != null ? `${n} companies found.` : 'Sales research finished.'),
      link,
    });
  }
  if (!failed && u && u.email_notify_on_done && isEmailConfigured()) {
    const countTxt = n != null ? ` — ${n} companies` : '';
    await sendEmail({
      to: u.email,
      subject: `${project.seed_domain} buyer research is ready`,
      text: `Your buyer research for ${project.seed_domain} just finished${countTxt}.\n\nOpen it: ${link}\n\n(You're getting this because "Email me when reports finish" is on. Turn it off in the sidebar to stop.)`,
      html: `<p>Your buyer research for <strong>${esc(project.seed_domain)}</strong> just finished${esc(countTxt)}.</p>`
        + `<p><a href="${esc(link)}" style="display:inline-block;padding:10px 16px;background:#e48069;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Open the buyers</a></p>`
        + `<p style="color:#999;font-size:11px">You're getting this because "Email me when reports finish" is on. Turn it off in the sidebar to stop.</p>`,
    });
  }
  return { created: true };
}

// Cost-gated pipeline. The default ('shallow') pass uses only FREE sources and
// still runs the LLM to write a narrative — but spends NO paid-API credits. A
// deliberate 'deep' pass (triggered by the user's "go deeper") opens the paid
// sources. The deep path is split into TWO steps — gather, then critique — so
// each phase gets its own Vercel function-duration budget (rather than trying
// to fit gather + critique in one 300s invocation, which routinely timed out).
// Inngest invokes onFailure as a SEPARATE function (fresh Vercel invocation,
// fresh budget) once the main function exhausts its retries — including when
// Vercel hard-killed the original process at maxDuration. The in-function
// try/catch can't catch a Vercel hard-timeout (the process is killed mid-call),
// so without this handler the run row stays in 'running' status forever and
// the UI polls it indefinitely. Here we guarantee a failure is always recorded.
export const runResearch = inngest.createFunction(
  {
    id: 'run-domain-research',
    retries: 1,
    // User-initiated cancel (api/research.js POST {cancel:true}) sends
    // RUN_CANCELLED with the runId; Inngest stops this run at the next step
    // boundary so no further (paid) steps run — the whole point is saving spend.
    cancelOn: [{ event: RUN_CANCELLED, match: 'data.runId' }],
    onFailure: async ({ event, step }) => {
      const original = event && event.data && event.data.event;
      const runId = original && original.data && original.data.runId;
      if (!runId) return;
      const err = event && event.data && event.data.error;
      // A transient API error (overload / rate-limit / 5xx) gets a clean,
      // retryable line; only the genuine unknown failures carry the maxDuration note.
      const message =
        friendlyApiError(err) ||
        String((err && (err.message || err.name)) || err || 'Run failed').slice(0, 500) +
        ' (Vercel function likely hit maxDuration; marked errored by onFailure handler.)';
      await step.run('mark-error-on-failure', () => failRun(runId, message));
    },
  },
  { event: RUN_REQUESTED },
  async ({ event, step }) => {
    const { runId, domain, question, phase = 'shallow', tier: tierOverride, carryChatFrom } = event.data;
    const deep = phase === 'deep';
    const isRegenSynth = phase === 'regenerate-synth';
    const isRegenDeep = phase === 'regenerate-deep';
    const isRegen = isRegenSynth || isRegenDeep;
    // `tier` may be overridden by the caller — a synth regenerate by a non-deep
    // user runs at the FREE tier so it never spends paid credits.
    const tier = tierOverride || ((deep || isRegen) ? 'all' : 'free');

    await step.run('mark-running', () =>
      setRunStatus(runId, 'running', isRegen ? 'regenerating' : (deep ? 'deepening' : 'gathering')),
    );

    // Approved playbook lessons get prepended to the SYSTEM_PROMPT. Loaded
    // once per run and reused across gather + critique so both phases see
    // the same rules. Empty when the table is absent or has no approved
    // rows — the agent runs normally either way.
    const { addendum: lessons, ids: lessonIds } = await step.run('load-lessons', () => loadLessonsAddendum());

    // Regenerate-from-chat path: load the chat thread once and treat it as
    // authoritative corrections for the gather/critique passes that follow.
    // Synth mode skips gather() entirely and just re-runs critique() on the
    // existing draft with the corrections; deep mode re-runs the whole
    // pipeline seeded with them. The chat thread itself is not deleted —
    // it stays as the audit trail of how the report got refined.
    // Regenerate pulls THIS run's chat as corrections. A forced fresh re-research
    // (new run id) instead carries the PRIOR run's chat forward — copies the
    // transcript into this run so it persists visibly, and feeds it as corrections
    // so the new report ingests the chat-derived research/refinements (rather than
    // orphaning them on the old run). Per-domain notes already persist separately.
    let chatCorrections = '';
    if (isRegen) {
      chatCorrections = await step.run('load-chat-corrections', async () =>
        formatChatCorrections(await getChat(runId)));
    } else if (carryChatFrom) {
      chatCorrections = await step.run('carry-prior-chat', async () => {
        const turns = await getChat(carryChatFrom);
        if (!turns || !turns.length) return '';
        await copyChatToRun(runId, domain, turns).catch(() => 0);
        return formatChatCorrections(turns);
      });
    }

    // User notes attached to this domain's report (kept per-domain so they
    // survive every rerun). Fed into gather + critique as authoritative context
    // so a rerun ingests them and lets them add color to the results. Best-effort.
    const userNotes = await step.run('load-user-notes', () =>
      getDomainNotes(domain).then((n) => (n && n.notes) || '').catch(() => ''),
    );

    try {
      let report;
      let trace;
      let gathered;
      if (isRegenSynth) {
        // No new gather() — pull the existing draft and trace from the run
        // record and feed them straight into critique() with corrections.
        const existing = await step.run('load-existing-draft', () => getRun(runId));
        const draft = (existing && existing.report && existing.report.markdown) || '';
        const priorTrace = (existing && existing.report && existing.report.trace) || [];
        if (!draft) throw new Error('regenerate-synth: existing draft is empty — run gather first');
        await step.run('mark-verifying', () => setRunStatus(runId, 'running', 'regenerating'));
        const refined = await step.run('critique-regen', () =>
          withCategory('domain_owner', () => critique({ domain, env: process.env, tier, draft, priorTrace, lessons, chatCorrections, userNotes })),
        );
        report = refined.report;
        trace = refined.trace;
        // Preserve the original toolsAvailable/categories from the existing
        // report so the save shape matches the original-run shape.
        gathered = {
          toolsAvailable: (existing && existing.report && existing.report.toolsAvailable) || [],
          categories: (existing && existing.report && existing.report.categories) || {},
        };
      } else {
        // Phase 1: gather — owns its own Vercel invocation (~300s budget).
        // For regenerate-deep, chatCorrections gets folded into the user
        // prompt so the new pass anchors on the user's confirmed findings.
        gathered = await step.run('gather', () =>
          withCategory('domain_owner', () => gather({ domain, question, env: process.env, tier, lessons, chatCorrections, userNotes })),
        );

        report = gathered.report;
        trace = gathered.trace;

        // Phase 2: critique — deep and regenerate-deep, separate Vercel
        // invocation. Synth path already ran critique above.
        if ((deep || isRegenDeep) && process.env.RESEARCH_CRITIQUE !== 'off') {
          await step.run('mark-verifying', () => setRunStatus(runId, 'running', 'verifying'));
          const refined = await step.run('critique', () =>
            withCategory('domain_owner', () => critique({ domain, env: process.env, tier, draft: report, priorTrace: trace, lessons, chatCorrections, userNotes })),
          );
          report = refined.report;
          trace = refined.trace;
        }
      }

      // Phase 3: auto owner-crack fallback — when the report did NOT confidently
      // name the owner, triangulate off ccTLD/affix/brand-root siblings for a
      // public registrant sharing the DNS fingerprint, and fold any find into the
      // report as a transparent section. Free + fail-open; skipped at High confidence.
      const crack = await step.run('owner-crack-fallback', () =>
        maybeCrackOwner({ domain, markdown: report, env: process.env }).catch((err) => {
          console.error('owner-crack-fallback failed:', err && err.message);
          return null;
        }),
      );
      if (crack && crack.section) report = `${report}\n\n${crack.section}`;

      await step.run('save-report', () =>
        saveRunReport(runId, {
          format: 'markdown',
          markdown: report,
          trace,
          toolsAvailable: gathered.toolsAvailable,
          categories: gathered.categories,
          phase,
        }),
      );
      // Optional notification — its own durable step so a transient Resend
      // failure can retry without blocking save-report from succeeding.
      await step.run('notify-owner', () => notifyOwnerIfWanted(runId).catch((err) => {
        console.error('notify-owner failed:', err && err.message);
        return { sent: false, reason: 'send failed' };
      }));
      // In-app bell notification — durable, non-blocking (table may not exist
      // pre-migration; swallow so save-report still completes).
      await step.run('notify-in-app', () => createReportNotification(runId).catch((err) => {
        console.error('notify-in-app failed:', err && err.message);
        return { created: false };
      }));
      // Bump applied_count on the lessons that rode along on this run —
      // fire-and-forget, drift in the counter is acceptable.
      if (Array.isArray(lessonIds) && lessonIds.length) {
        await step.run('bump-lesson-counts', () => bumpAppliedCounts(lessonIds));
      }
      return { runId, ok: true, phase };
    } catch (err) {
      // Clean, retryable message for transient API errors (overload/429/5xx);
      // raw message otherwise. The UI renders run.error verbatim.
      const message = friendlyApiError(err) || String(err?.message || err);
      await step.run('mark-error', () => failRun(runId, message));
      throw err; // let Inngest record the failure
    }
  },
);

// Refine-chat turn — async so it isn't bound by the 60s API function cap (a
// turn may run several lookups). The pending assistant row is filled in when done.
export const runChat = inngest.createFunction(
  { id: 'run-refine-chat', retries: 1 },
  { event: CHAT_REQUESTED },
  async ({ event, step }) => {
    const { turnId, runId } = event.data;
    try {
      const reply = await step.run('chat', () => withCategory('domain_owner', async () => {
        const run = await getRun(runId);
        const domain = (run && run.domain) || '';
        const reportMarkdown = (run && run.report && run.report.markdown) || '';
        const rows = (await getChat(runId)).filter((m) => m.status !== 'pending');
        const message = rows.length ? rows[rows.length - 1].content : '';
        const history = rows.slice(0, -1);
        const { addendum: lessons } = await loadLessonsAddendum();
        const emails = await chatEmailContext(runId).catch(() => '');
        const result = await chatTurn({ domain, reportMarkdown, history, message, env: process.env, lessons, emails });
        let text = String((result && result.report) || '').trim();
        if (!text) {
          // The model ended without a written answer — surface what it checked so
          // the turn is never a blank "(no response)".
          const tools = [...new Set((result.trace || []).map((t) => t.tool).filter(Boolean))].join(', ');
          text =
            `I ran the lookups${tools ? ` (${tools})` : ''} but couldn't compose a written answer that turn. ` +
            `Try a narrower, single-step ask — e.g. "run whois_lookup on horoscopes.com" or "whoxy_reverse the registrant email".`;
        }
        return text;
      }));
      await step.run('save', () => updateTurn(turnId, reply, 'done'));
      return { turnId, ok: true };
    } catch (err) {
      const message = friendlyApiError(err) || String(err?.message || err).slice(0, 300);
      await step.run('save-error', () => updateTurn(turnId, `⚠️ ${message}`, 'error'));
      throw err;
    }
  },
);

// ── Sales Research Agent (Phase 1A — Upgrade) ───────────────────────────────
// Deterministic pipeline: DISCOVER (free enumerate × autocomplete) → RESOLVE +
// CLASSIFY + RANK (firmographics + ability-to-pay; enriches ACTIVE candidates
// only — cost control) → persist candidates. Contact ENRICH is a separate
// on-demand step (api/sales.js → enrichCompany), not part of this run.
export const runSalesResearch = inngest.createFunction(
  {
    id: 'run-sales-research',
    retries: 1,
    onFailure: async ({ event, step }) => {
      const projectId = event?.data?.event?.data?.projectId;
      const message = String(event?.data?.error?.message || 'failed').slice(0, 500);
      if (projectId) await step.run('mark-failed', () => setSalesProjectStatus(projectId, 'failed', null, message));
    },
  },
  { event: SALES_RESEARCH_REQUESTED },
  async ({ event, step }) => {
    const { projectId } = event.data;
    try {
      const project = await step.run('load', () => getSalesProject(projectId));
      if (!project) return { projectId, ok: false, reason: 'not found' };

      // DISCOVER — free. Affix/TLD enumeration + the branded-operator pass (real
      // companies built around the seed word — the highest-intent upgrade buyers
      // that the affix dictionary misses, e.g. VideoAsk / Ask-AI / EasyAsk).
      await step.run('mark-discover', () => setSalesProjectStatus(projectId, 'running', 'discover'));
      const raw = await step.run('discover', async () => {
        const [upgrades, operators] = await Promise.all([
          discoverUpgrade(project.seed_domain, { classifyStatus: false }),
          discoverOperators(project.seed_domain, process.env).catch(() => []),
        ]);
        const byDomain = new Map();
        for (const c of [...upgrades, ...operators]) {
          const prev = byDomain.get(c.domain);
          if (!prev) byDomain.set(c.domain, c);
          else if (!prev.company && c.company) byDomain.set(c.domain, { ...prev, ...c });  // operator carries a real name
        }
        // Safety cap: a generic seed ("gush") can balloon to ~200 candidates, and
        // resolve fetches a full page per candidate — too many at once OOMed the
        // step. Prioritize the high-value rows (a real company name from discovery,
        // then exact-SLD tld_variants) over the ~100 bare affix probes, cap at 160.
        const rank = (c) => (c.company ? 0 : c.subtype === 'tld_variant' ? 1 : 2);
        return [...byDomain.values()].sort((a, b) => rank(a) - rank(b)).slice(0, 160);
      });

      // RESOLVE + CLASSIFY + RANK — enriches active candidates only.
      await step.run('mark-resolve', () => setSalesProjectStatus(projectId, 'running', 'resolve'));
      const resolved = await step.run('resolve', () => resolveCandidates(raw, { env: process.env, enrich: true }));

      // RELEVANCE GATE — demote big-but-off-target companies (a school / souvenir
      // shop that coincidentally matches) to "Others" so they can't rank as strong.
      await step.run('mark-relevance', () => setSalesProjectStatus(projectId, 'running', 'relevance'));
      const gated = await step.run('relevance', () => gateRelevance(project.seed_domain, resolved, process.env));

      await step.run('persist', () => insertSalesCandidates(projectId, gated));
      await step.run('mark-done', () => setSalesProjectStatus(projectId, 'done', 'done'));
      await step.run('notify', () => createSalesNotification(projectId).catch((err) => {
        console.error('[sales notify]', err?.message || err); return { created: false };
      }));
      return { projectId, ok: true, candidates: resolved.length };
    } catch (err) {
      const message = String(err?.message || err);
      await step.run('mark-error', () => setSalesProjectStatus(projectId, 'failed', null, message));
      await step.run('notify-failed', () => createSalesNotification(projectId, { failed: true }).catch(() => ({ created: false })));
      throw err;
    }
  },
);

// Tier-2 category fan-out (Explore by category) — async so multiple per-category
// LLM calls + liveness checks aren't bound by the API's 60s cap (which surfaced on
// mobile as "Load failed"). Appends the discovered companies to the project.
export const runSalesAngles = inngest.createFunction(
  { id: 'sales-angles', name: 'Sales Research — category fan-out' },
  { event: SALES_ANGLES_REQUESTED },
  async ({ event, step }) => {
    const { projectId, angles, limit } = event.data;
    if (!projectId || !Array.isArray(angles) || !angles.length) return { ok: false, reason: 'bad payload' };
    try {
      const project = await step.run('load', () => getSalesProject(projectId));
      if (!project) return { ok: false, reason: 'not found' };
      await step.run('mark-running', () => setSalesProjectStatus(projectId, 'running', 'categories'));

      const fresh = await step.run('discover-angles', async () => {
        const discovered = await discoverAngles(project.seed_domain, angles, process.env, { limitPerAngle: limit || 15 });
        const existing = new Set((await listSalesCandidates(projectId)).map((c) => (c.domain || '').toLowerCase()));
        return discovered.filter((c) => c.domain && !existing.has(c.domain.toLowerCase()));
      });
      if (fresh.length) await step.run('persist', () => insertSalesCandidates(projectId, fresh));
      await step.run('mark-done', () => setSalesProjectStatus(projectId, 'done', 'done'));
      await step.run('notify', () => createSalesNotification(projectId).catch(() => ({ created: false })));
      return { ok: true, added: fresh.length };
    } catch (err) {
      await step.run('mark-error', () => setSalesProjectStatus(projectId, 'failed', null, String(err?.message || err)));
      throw err;
    }
  },
);

// Corporate Portfolios — reverse-WHOIS pull of a company's registered domains,
// filtered to "premium" names. Async because a large registrant paginates across
// many Whoxy pages (0.5s apart), past the API function's 60s cap.
export const runCorporatePortfolio = inngest.createFunction(
  {
    id: 'run-corporate-portfolio',
    retries: 1,
    onFailure: async ({ event, step }) => {
      const runId = event?.data?.event?.data?.runId;
      const message = String(event?.data?.error?.message || 'failed').slice(0, 500);
      if (runId) await step.run('mark-failed', () => setPortfolioRunStatus(runId, 'failed', { error: message }));
    },
  },
  { event: PORTFOLIO_REQUESTED },
  async ({ event, step }) => {
    const { runId } = event.data;
    try {
      const run = await step.run('load', () => getPortfolioRun(runId));
      if (!run) return { runId, ok: false, reason: 'not found' };

      // KEYS — turn the seed (domain / company / email) into reverse-WHOIS search
      // terms (a domain seed derives the registrant org/email from live WHOIS).
      await step.run('mark-keys', () => setPortfolioRunStatus(runId, 'running', { stage: 'keys' }));
      const keys = await step.run('derive-keys', () => deriveRegistrantKeys(run.query, process.env));

      // PULL — union every reverse-WHOIS provider (Whoxy ∪ WhoisXML current+historic
      // ∪ DomainIQ best-effort) across all derived terms.
      await step.run('mark-pull', () => setPortfolioRunStatus(runId, 'running', { stage: 'pull' }));
      const pull = await step.run('pull', () => pullPortfolio(keys.terms, { env: process.env }));

      // CLASSIFY — keep the WHOLE portfolio; FLAG which names are premium (short or
      // dictionary .com). 5+ char SLDs need a dictionary check; batch it in one DB
      // pass against english_words, then classify purely.
      await step.run('mark-classify', () => setPortfolioRunStatus(runId, 'running', { stage: 'classify' }));
      const classified = await step.run('classify', async () => {
        const filter = run.filter || undefined;
        const need = wordsNeedingDictionary(pull.domains, filter);
        const dict = need.length ? await filterDictionaryWords(need) : new Set();
        return pull.domains.map((d) => {
          const { premium, reason } = classifyPremium(d.domain, filter, (sld) => dict.has(sld));
          return { ...d, premium, premium_reason: premium ? reason : null };
        }).sort((a, b) => {
          // premium first, then shortest SLD, then alpha
          if (a.premium !== b.premium) return a.premium ? -1 : 1;
          const la = a.domain.split('.')[0].length, lb = b.domain.split('.')[0].length;
          return la - lb || a.domain.localeCompare(b.domain);
        });
      });
      const premiumCount = classified.filter((d) => d.premium).length;

      await step.run('persist', () => insertPortfolioDomains(runId, classified));
      await step.run('mark-done', () => setPortfolioRunStatus(runId, 'done', {
        stage: 'done',
        premium_count: premiumCount,
        total_results: pull.total_results,
        credits_used: pull.credits_used,
        capped: false,
        // Per-provider breakdown for transparency (stashed in the filter jsonb to
        // avoid a migration): { whoxy, whoisxml, domainiq } + the seed keys used.
        filter: { ...(run.filter || {}), providers: pull.provider_counts, keys: keys.terms.map((t) => `${t.field}:${t.term}`), errors: (pull.errors || []).slice(0, 8) },
      }));
      return { runId, ok: true, premium: premiumCount, scanned: pull.total_results, providers: pull.provider_counts };
    } catch (err) {
      const message = String(err?.message || err);
      await step.run('mark-error', () => setPortfolioRunStatus(runId, 'failed', { error: message }));
      throw err;
    }
  },
);

// Person deep-dive — the FREE pass (identify + cross-platform VIP triangulation +
// free professional context + LLM synthesis). The paid contact reveal is a sync
// API action, not part of this pipeline. Wrapped in withCategory for usage tagging.
export const runPerson = inngest.createFunction(
  {
    id: 'run-person',
    retries: 1,
    onFailure: async ({ event, step }) => {
      const runId = event?.data?.event?.data?.runId;
      const message = String(event?.data?.error?.message || 'failed').slice(0, 500);
      if (runId) await step.run('mark-failed', () => setPersonRunStatus(runId, 'failed', { error: message }));
    },
  },
  { event: PERSON_REQUESTED },
  async ({ event, step }) => {
    const { runId } = event.data;
    try {
      const run = await step.run('load', () => getPersonRun(runId));
      if (!run) return { runId, ok: false, reason: 'not found' };
      await step.run('mark-running', () => setPersonRunStatus(runId, 'running', { stage: 'identify' }));
      const dossier = await step.run('deep-dive', () => withCategory('person', () => runPersonDeepDive({ url: run.input_url, name: run.subject_name || null, env: process.env })));
      await step.run('mark-done', () => setPersonRunStatus(runId, 'done', {
        stage: 'done',
        subject_name: dossier.subject?.name || run.subject_name || null,
        platform: dossier.subject?.input_platform || run.platform || null,
        vip_band: dossier.vip?.band || null,
        result: dossier,
      }));
      return { runId, ok: true, vip: dossier.vip?.band, presence: dossier.presence_count };
    } catch (err) {
      const message = String(err?.message || err);
      await step.run('mark-error', () => setPersonRunStatus(runId, 'failed', { error: message }));
      throw err;
    }
  },
);

// ── Inbound-lead enrichment ──────────────────────────────────────────────────
// Person deep-dive + company firmographics + triage for an inbound contact-form
// lead. Keyed by the deterministic lead_key so the dossier URL is stable.
export const runLead = inngest.createFunction(
  {
    id: 'run-lead',
    retries: 1,
    onFailure: async ({ event, step }) => {
      const key = event?.data?.event?.data?.lead_key;
      const message = String(event?.data?.error?.message || 'failed').slice(0, 500);
      if (key) await step.run('mark-failed', () => setLeadStatus(key, 'failed', { error: message }));
    },
  },
  { event: LEAD_REQUESTED },
  async ({ event, step }) => {
    const { lead_key } = event.data;
    try {
      const lead = await step.run('load', () => getLeadByKey(lead_key));
      if (!lead) return { lead_key, ok: false, reason: 'not found' };
      await step.run('mark-running', () => setLeadStatus(lead_key, 'running'));
      const form = { ...(lead.form || {}), email: lead.email, domain_of_interest: lead.domain_of_interest, budget: lead.budget, intent: lead.intent };
      const dossier = await step.run('enrich', () => withCategory('lead', () => runLeadEnrich({ form, env: process.env })));
      await step.run('mark-done', () => setLeadStatus(lead_key, 'done', {
        tier: dossier.triage ? dossier.triage.tier : null,
        result: dossier,
      }));
      return { lead_key, ok: true, tier: dossier.triage && dossier.triage.tier };
    } catch (err) {
      await step.run('mark-error', () => setLeadStatus(lead_key, 'failed', { error: String(err?.message || err) }));
      throw err;
    }
  },
);

export const functions = [runResearch, runChat, runSalesResearch, runSalesAngles, runCorporatePortfolio, runPerson, runLead];
