import { inngest, RUN_REQUESTED, CHAT_REQUESTED } from './client.js';
import { gather, critique, chatTurn } from '../agent.js';
import { setRunStatus, saveRunReport, failRun, getRun } from '../db/runs.js';
import { getChat, updateTurn } from '../db/chat.js';
import { getUser } from '../db/users.js';
import { sendEmail, isEmailConfigured } from '../email.js';
import { reportUrl } from '../reportUrl.js';
import { summarizeReport } from '../reportSummary.js';

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
  const passLabel = deep ? 'Deep report' : 'Free report';
  const found = summary && summary.found;
  const owner = summary && summary.likelyOwner;
  const ownerContact = summary && summary.primaryContact && summary.primaryContact.value;
  const conf = summary && summary.confidence;

  // Headline = the bottom-line sentence at the top of the email; subject
  // mirrors it so the inbox preview already tells the user what we found.
  let subject;
  let headline;
  if (found && owner) {
    subject = `${passLabel} ready: ${domain} — likely owner ${owner}${conf ? ` (${conf} confidence)` : ''}`;
    headline = `Likely owner: ${owner}${conf ? ` — ${conf} confidence` : ''}.`;
  } else if (found && ownerContact) {
    subject = `${passLabel} ready: ${domain} — owner lead ${ownerContact}${conf ? ` (${conf})` : ''}`;
    headline = `Best owner lead: ${ownerContact}${conf ? ` — ${conf} confidence` : ''}.`;
  } else {
    subject = `${passLabel} ready: ${domain} — owner not confidently identified`;
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

  return { subject, headline, bottomLine, nextStepText, nextStepHtml };
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
  const { subject, headline, bottomLine, nextStepText, nextStepHtml } = buildEmailCopy({
    domain: run.domain,
    phase,
    summary,
    url,
  });

  const textParts = [
    `Your domain ownership research on ${run.domain} just finished.`,
    headline,
  ];
  if (bottomLine) textParts.push(bottomLine);
  textParts.push(`Open the report: ${url}`);
  textParts.push(nextStepText);
  textParts.push(`(You're getting this because "Email me when reports finish" is on. Turn it off in the sidebar to stop.)`);

  const htmlParts = [
    `<p>Your domain ownership research on <strong>${esc(run.domain)}</strong> just finished.</p>`,
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
    const tier = deep ? 'all' : 'free';

    await step.run('mark-running', () => setRunStatus(runId, 'running', deep ? 'deepening' : 'gathering'));

    try {
      // Phase 1: gather — owns its own Vercel invocation (~300s budget).
      const gathered = await step.run('gather', () =>
        gather({ domain, question, env: process.env, tier }),
      );

      let report = gathered.report;
      let trace = gathered.trace;

      // Phase 2: critique — deep only, separate Vercel invocation.
      if (deep && process.env.RESEARCH_CRITIQUE !== 'off') {
        await step.run('mark-verifying', () => setRunStatus(runId, 'running', 'verifying'));
        const refined = await step.run('critique', () =>
          critique({ domain, env: process.env, tier, draft: report, priorTrace: trace }),
        );
        report = refined.report;
        trace = refined.trace;
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
        const result = await chatTurn({ domain, reportMarkdown, history, message, env: process.env });
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
