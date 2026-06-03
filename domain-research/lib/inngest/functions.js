import { inngest, RUN_REQUESTED, CHAT_REQUESTED, RUN_CANCELLED } from './client.js';
import { gather, critique, chatTurn } from '../agent.js';
import { setRunStatus, saveRunReport, failRun, getRun } from '../db/runs.js';
import { getChat, updateTurn } from '../db/chat.js';
import { getUser } from '../db/users.js';
import { createNotification } from '../db/notifications.js';
import { loadLessonsAddendum, bumpAppliedCounts } from '../db/lessons.js';
import { sendEmail, isEmailConfigured } from '../email.js';
import { reportUrl } from '../reportUrl.js';
import { summarizeReport } from '../reportSummary.js';

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
      const message =
        String((err && (err.message || err.name)) || err || 'Run failed').slice(0, 500) +
        ' (Vercel function likely hit maxDuration; marked errored by onFailure handler.)';
      await step.run('mark-error-on-failure', () => failRun(runId, message));
    },
  },
  { event: RUN_REQUESTED },
  async ({ event, step }) => {
    const { runId, domain, question, phase = 'shallow' } = event.data;
    const deep = phase === 'deep';
    const isRegenSynth = phase === 'regenerate-synth';
    const isRegenDeep = phase === 'regenerate-deep';
    const isRegen = isRegenSynth || isRegenDeep;
    const tier = (deep || isRegen) ? 'all' : 'free';

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
    const chatCorrections = isRegen
      ? await step.run('load-chat-corrections', async () => formatChatCorrections(await getChat(runId)))
      : '';

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
          critique({ domain, env: process.env, tier, draft, priorTrace, lessons, chatCorrections }),
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
          gather({ domain, question, env: process.env, tier, lessons, chatCorrections }),
        );

        report = gathered.report;
        trace = gathered.trace;

        // Phase 2: critique — deep and regenerate-deep, separate Vercel
        // invocation. Synth path already ran critique above.
        if ((deep || isRegenDeep) && process.env.RESEARCH_CRITIQUE !== 'off') {
          await step.run('mark-verifying', () => setRunStatus(runId, 'running', 'verifying'));
          const refined = await step.run('critique', () =>
            critique({ domain, env: process.env, tier, draft: report, priorTrace: trace, lessons, chatCorrections }),
          );
          report = refined.report;
          trace = refined.trace;
        }
      }

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
      const message = String(err?.message || err);
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
      const reply = await step.run('chat', async () => {
        const run = await getRun(runId);
        const domain = (run && run.domain) || '';
        const reportMarkdown = (run && run.report && run.report.markdown) || '';
        const rows = (await getChat(runId)).filter((m) => m.status !== 'pending');
        const message = rows.length ? rows[rows.length - 1].content : '';
        const history = rows.slice(0, -1);
        const { addendum: lessons } = await loadLessonsAddendum();
        const result = await chatTurn({ domain, reportMarkdown, history, message, env: process.env, lessons });
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
      });
      await step.run('save', () => updateTurn(turnId, reply, 'done'));
      return { turnId, ok: true };
    } catch (err) {
      await step.run('save-error', () => updateTurn(turnId, `⚠️ ${String(err?.message || err).slice(0, 300)}`, 'error'));
      throw err;
    }
  },
);

export const functions = [runResearch, runChat];
