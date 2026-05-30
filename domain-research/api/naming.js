import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { isNamingDbConfigured } from '../lib/db/supabase-naming.js';
import { parseBrief } from '../lib/naming/brief.js';
import { searchUniverse } from '../lib/naming/query.js';
import { runNamingChatTurn } from '../lib/naming/chat.js';
import { saveNamingRun, listNamingRuns, getNamingRun } from '../lib/db/naming-runs.js';
import { listNamingChat, addNamingChatMessage } from '../lib/db/naming-chat.js';

export const config = { maxDuration: 30 };

// Single endpoint for the v1 Naming Exercise (spec §1-5) plus the Recent /
// Past Naming Runs affordance. Action-multiplexed so the whole feature
// stays within one serverless function:
//   POST { action: 'search', brief: '...' } → { run_id, filters, buyReady, stretch }
//   POST { action: 'export', brief, results } → 501 unless Google service
//                                               account env is configured
//   GET  ?list=1[&q=...]    → list past naming runs (own + admin sees all)
//   GET  ?id=<uuid>         → fetch a specific past naming run
// CSV export lives entirely in the browser (§5.2), no backend needed.
export default async function handler(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const user = await currentUser(req);
  if (user && !userCan(user, 'naming')) {
    res.status(403).json({ error: "You don't have access to the Naming module — ask an admin to enable it." });
    return;
  }

  if (req.method === 'GET') {
    if (typeof req.query.chat_run === 'string' && req.query.chat_run) {
      try {
        const messages = await listNamingChat(req.query.chat_run);
        res.status(200).json({ messages });
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) });
      }
      return;
    }
    if (req.query.list !== undefined) {
      const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : '';
      // Scope to the user's own runs; admins see everything.
      const scope = user && user.is_admin ? null : (user && user.id ? user.id : null);
      try {
        const runs = await listNamingRuns({ user_id: scope, q, limit: 100 });
        res.status(200).json({ runs });
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) });
      }
      return;
    }
    if (typeof req.query.id === 'string' && req.query.id) {
      try {
        const run = await getNamingRun(req.query.id);
        if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
        // A non-admin can only open their own runs (or any unscoped legacy
        // row, which has user_id null).
        if (user && !user.is_admin && run.user_id && run.user_id !== user.id) {
          res.status(403).json({ error: 'Not your run' });
          return;
        }
        res.status(200).json({ run });
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) });
      }
      return;
    }
    res.status(400).json({ error: 'Pass ?list=1 or ?id=<uuid>' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const action = String(body.action || 'search');

  if (action === 'search') return handleSearch(body, res, user);
  if (action === 'export') return handleExport(body, res);
  if (action === 'chat') return handleChat(body, res, user);
  res.status(400).json({ error: `Unknown action: ${action}` });
}

async function handleChat(body, res, user) {
  const runId = body.run_id;
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!runId || !message) {
    res.status(400).json({ error: 'run_id and message are required' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY' });
    return;
  }
  if (!isNamingDbConfigured()) {
    res.status(500).json({ error: 'Server is missing SUPABASE_NAMING_URL / SUPABASE_NAMING_SERVICE_KEY' });
    return;
  }
  const run = await getNamingRun(runId);
  if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
  if (user && !user.is_admin && run.user_id && run.user_id !== user.id) {
    res.status(403).json({ error: 'Not your run' });
    return;
  }
  // The run record stores the ORIGINAL brief snapshot. Layer in the latest
  // chat-refined snapshot (if any) so the agent reasons about the user's
  // current view, not the stale original.
  const history = await listNamingChat(runId);
  const latestRefinement = [...history].reverse().find((m) => m.role === 'assistant' && m.result_snapshot);
  const currentRun = {
    brief: run.brief,
    filters: latestRefinement ? (latestRefinement.refined_filters || run.filters) : run.filters,
    buy_ready: latestRefinement ? (latestRefinement.result_snapshot?.buyReady || []) : (run.buy_ready || []),
    stretch: latestRefinement ? (latestRefinement.result_snapshot?.stretch || []) : (run.stretch || []),
  };

  // Persist the user turn before running the model so a model failure still
  // leaves the question in the thread (with an error assistant reply).
  let userRow;
  try {
    userRow = await addNamingChatMessage({ run_id: runId, role: 'user', content: message });
  } catch (e) {
    res.status(500).json({ error: `Failed to record message: ${e.message || e}` });
    return;
  }

  try {
    const turn = await runNamingChatTurn({ run: currentRun, history, message, env: process.env });
    const result_snapshot = turn.refined_results
      ? { buyReady: turn.refined_results.buyReady || [], stretch: turn.refined_results.stretch || [] }
      : null;
    const assistantRow = await addNamingChatMessage({
      run_id: runId,
      role: 'assistant',
      content: turn.reply,
      refined_filters: turn.merged_filters || null,
      result_snapshot,
      status: 'done',
    });
    res.status(200).json({
      user_message: userRow,
      assistant_message: assistantRow,
      // Convenience for the frontend so it doesn't have to re-fetch on a
      // refine turn — present only when the chat altered the result set.
      refined: result_snapshot ? { filters: turn.merged_filters, ...result_snapshot } : null,
    });
  } catch (e) {
    await addNamingChatMessage({
      run_id: runId,
      role: 'assistant',
      content: `⚠️ ${String(e.message || e).slice(0, 400)}`,
      status: 'error',
    }).catch(() => {});
    res.status(502).json({ error: String(e.message || e) });
  }
}

async function handleSearch(body, res, user) {
  const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
  if (!brief) {
    res.status(400).json({ error: 'Brief is required' });
    return;
  }
  if (!isNamingDbConfigured()) {
    res.status(500).json({ error: 'Server is missing SUPABASE_NAMING_URL / SUPABASE_NAMING_SERVICE_KEY' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY' });
    return;
  }
  let filters;
  try {
    filters = await parseBrief(brief, process.env);
  } catch (e) {
    res.status(502).json({ error: `Couldn't parse your brief: ${e.message || e}` });
    return;
  }
  let results;
  try {
    results = await searchUniverse(filters);
  } catch (e) {
    res.status(502).json({ error: `Universe query failed: ${e.message || e}` });
    return;
  }
  // Persist for the Recent / Past Naming Runs view. Failure to save must
  // never fail the search itself — the user got their results either way.
  let savedId = null;
  try {
    const saved = await saveNamingRun({
      user_id: user && user.id ? user.id : null,
      brief,
      filters,
      buyReady: results.buyReady,
      stretch: results.stretch,
    });
    savedId = saved && saved.id;
  } catch (e) {
    console.error('saveNamingRun failed:', e && e.message);
  }
  res.status(200).json({ run_id: savedId, filters, ...results });
}

// Google Sheets export (§5.1). The spec calls for the same
// GOOGLE_SERVICE_ACCOUNT_JSON the admin app uses. Until that env is provisioned
// on this Vercel project (and the googleapis dep is added), this returns 501
// with a clear message — the browser-side CSV export (§5.2) handles the v1
// "get the results out of the app" path on its own.
async function handleExport(_body, res) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    res.status(501).json({
      error:
        'Google Sheets export is not configured on this deployment. ' +
        'Use "Copy as CSV" for now, or set GOOGLE_SERVICE_ACCOUNT_JSON ' +
        'and wire the googleapis client to enable sheet export.',
    });
    return;
  }
  // Intentionally not implemented in this PR — the dep + service-account
  // plumbing is a follow-up. Leaving the action shape stable so the frontend
  // export button keeps working once the backend lands.
  res.status(501).json({ error: 'Sheet export endpoint stub — implementation pending' });
}
