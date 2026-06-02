import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { isNamingDbConfigured } from '../lib/db/supabase-naming.js';
import { parseBrief } from '../lib/naming/brief.js';
import { searchUniverse } from '../lib/naming/query.js';
import { runNamingChatTurn } from '../lib/naming/chat.js';
import { saveNamingRun, updateNamingRun, listNamingRuns, getNamingRun, renameNamingRun, setNamingRunStar } from '../lib/db/naming-runs.js';
import { listNamingChat, addNamingChatMessage } from '../lib/db/naming-chat.js';
import { fetchText, extractClues } from '../lib/util.js';
import { getFreshLiveChecks, saveLiveChecks } from '../lib/db/livechecks.js';

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
      const starred_only = req.query.starred === '1' || req.query.starred === 'true';
      try {
        const runs = await listNamingRuns({ user_id: scope, q, limit: 100, starred_only });
        res.status(200).json({ runs });
      } catch (e) {
        const msg = String(e.message || e);
        if (/relation .*does not exist|naming_runs/i.test(msg)) {
          res.status(500).json({ error: `The naming_runs table doesn't exist on this Supabase yet — apply domain-research/supabase/schema.sql to create it. (${msg})` });
          return;
        }
        res.status(500).json({ error: msg });
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
  if (action === 'export') return handleExport(body, res, user);
  if (action === 'chat') return handleChat(body, res, user);
  if (action === 'rename') return handleRename(body, res, user);
  if (action === 'star') return handleStar(body, res, user);
  if (action === 'verify') return handleVerify(body, res, user);
  res.status(400).json({ error: `Unknown action: ${action}` });
}

// Star/unstar a run (owner or admin only).
async function handleStar(body, res, user) {
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) { res.status(400).json({ error: 'id is required' }); return; }
  const run = await getNamingRun(id);
  if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
  if (user && !user.is_admin && run.user_id && run.user_id !== user.id) {
    res.status(403).json({ error: 'Not your run' });
    return;
  }
  try {
    const updated = await setNamingRunStar(id, Boolean(body.starred));
    res.status(200).json({ ok: true, run: updated });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}

// Live "is this actually for sale?" check. Sedo / direct-Snagged listings go
// stale: a domain listed months ago may now resolve to an active company site
// (e.g. serb.com → a pharma co), so it's not really gettable. We fetch the
// domain's live page and classify. Conservative on 'in_use' (only a confident
// active-company signal), since that's the one the UI hides — we never want to
// hide a genuinely for-sale name.
function classifyClues(clues, status) {
  const p = (clues && clues.parking) || {};
  if (Array.isArray(p.for_sale_signals) && p.for_sale_signals.length) return 'for_sale';
  // A server that refuses the crawler (Cloudflare/WAF 401/403/429) is an active,
  // protected site — parking/for-sale landers don't block bots, they want to be
  // seen. serb.com (pharma) 403s us; treat that as in-use. (404/5xx stay unclear.)
  if (status === 401 || status === 403 || status === 429) return 'in_use';
  const ai = clues.analytics_ids || {};
  const hasBiz = (clues.social_links || []).length > 0 || (clues.emails || []).length > 0
    || (ai.ga || []).length > 0 || (ai.gtm || []).length > 0 || (ai.meta_pixel || []).length > 0;
  const realContent = (clues.text_excerpt || '').length > 300 && Boolean(clues.title);
  // Confident active company: reachable, substantial content AND real business
  // signals (analytics/social/emails), and no for-sale text.
  if (status >= 200 && status < 400 && realContent && hasBiz) return 'in_use';
  if (p.likely_parked) return 'parked';
  return 'unclear';
}

async function verifyDomain(domain) {
  const d = String(domain || '').toLowerCase().trim();
  if (!d) return 'unclear';
  try {
    const r = await fetchText(`https://${d}/`, {}, 6000);
    return classifyClues(extractClues(r.body || ''), r.status);
  } catch {
    return 'unclear'; // unreachable / blocked → don't hide
  }
}

async function handleVerify(body, res, user) {
  const domains = Array.isArray(body.domains)
    ? [...new Set(body.domains.map((d) => String(d || '').toLowerCase().trim()).filter(Boolean))].slice(0, 12)
    : [];
  if (!domains.length) { res.status(200).json({ statuses: {} }); return; }
  // 24h cache first — only live-fetch the misses, then persist the new results.
  const cached = await getFreshLiveChecks(domains);
  const misses = domains.filter((d) => !(d in cached));
  const fresh = await Promise.all(misses.map(async (d) => [d, await verifyDomain(d)]));
  if (fresh.length) await saveLiveChecks(fresh.map(([domain, status]) => ({ domain, status })));
  res.status(200).json({ statuses: { ...cached, ...Object.fromEntries(fresh) } });
}

// Set a custom project name on a run (owner or admin only). Empty title clears.
async function handleRename(body, res, user) {
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) { res.status(400).json({ error: 'id is required' }); return; }
  const run = await getNamingRun(id);
  if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
  if (user && !user.is_admin && run.user_id && run.user_id !== user.id) {
    res.status(403).json({ error: 'Not your run' });
    return;
  }
  try {
    const updated = await renameNamingRun(id, body.title);
    res.status(200).json({ ok: true, run: updated });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
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
  // Explicit connotation control from the UI multi-select is authoritative:
  // a subset narrows results to those tones (enriched rows + still-unenriched
  // rows); all five selected (or none) = "Any" → no constraint, overriding any
  // tone the brief inferred.
  if (Array.isArray(body.connotation)) {
    const VALID = ['positive', 'somewhat positive', 'neutral', 'somewhat negative', 'negative'];
    const picked = [...new Set(body.connotation.map((c) => String(c || '').toLowerCase()).filter((c) => VALID.includes(c)))];
    filters.connotation = picked.length === 0 || picked.length >= VALID.length ? null : picked;
  }
  // TLD multi-select from the UI is authoritative when present — it overrides
  // whatever TLDs the brief inferred. Sent bare ('com'); normalize defensively.
  if (Array.isArray(body.tlds) && body.tlds.length) {
    const tlds = body.tlds.map((t) => String(t).replace(/^\./, '').toLowerCase()).filter(Boolean);
    if (tlds.length) filters.tlds = [...new Set(tlds)];
  }
  // Word-form exclusions from the UI (default none). Sanitize to the 4 known
  // keys; applied in-memory in searchUniverse() to avoid SQL statement timeouts.
  if (Array.isArray(body.exclude)) {
    const VALID_FORMS = ['plural', 'past', 'ing', 'ly'];
    filters.exclude_forms = [...new Set(body.exclude.map((f) => String(f || '').toLowerCase()).filter((f) => VALID_FORMS.includes(f)))];
  }
  // Price bounds from the UI inputs override the brief per-bound when provided
  // (a finite number); a bound sent as null leaves the brief's value for it.
  const uiNum = (v) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : null);
  if (body.price_min !== undefined && uiNum(body.price_min) != null) filters.min_price = uiNum(body.price_min);
  if (body.price_max !== undefined && uiNum(body.price_max) != null) filters.max_price = uiNum(body.price_max);
  // SLD letter-count + syllable-count bounds from the UI (override the brief
  // per-bound when a finite number is provided). Rounded to whole numbers.
  const uiInt = (v) => { const n = uiNum(v); return n == null ? null : Math.round(n); };
  if (body.len_min !== undefined && uiInt(body.len_min) != null) filters.sld_length_min = uiInt(body.len_min);
  if (body.len_max !== undefined && uiInt(body.len_max) != null) filters.sld_length_max = uiInt(body.len_max);
  if (body.syllables_min !== undefined && uiInt(body.syllables_min) != null) filters.syllables_min = uiInt(body.syllables_min);
  if (body.syllables_max !== undefined && uiInt(body.syllables_max) != null) filters.syllables_max = uiInt(body.syllables_max);
  let results;
  try {
    results = await searchUniverse(filters);
  } catch (e) {
    res.status(502).json({ error: `Universe query failed: ${e.message || e}` });
    return;
  }
  // Persist for the Past Naming Runs view. Run continuity: when the client
  // sends a run_id (it's editing an existing project), UPDATE that row in place
  // — re-running a brief / changing filters / tweaking the prompt all stay in
  // the same project. No run_id = new project (insert). Save failure must never
  // fail the search itself.
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null;
  const runId = typeof body.run_id === 'string' ? body.run_id : '';
  let savedId = null;
  try {
    if (runId) {
      const existing = await getNamingRun(runId);
      const owns = existing && (!user || user.is_admin || !existing.user_id || existing.user_id === user.id);
      if (owns) {
        await updateNamingRun(runId, { brief, filters, buyReady: results.buyReady, stretch: results.stretch, title });
        savedId = runId;
      }
    }
    if (!savedId) {
      const saved = await saveNamingRun({
        user_id: user && user.id ? user.id : null,
        brief, filters, buyReady: results.buyReady, stretch: results.stretch, title,
      });
      savedId = saved && saved.id;
    }
  } catch (e) {
    console.error('save/update naming run failed:', e && e.message);
  }
  res.status(200).json({ run_id: savedId, filters, ...results });
}

// Google Sheets export (§5.1). The spec calls for the same
// GOOGLE_SERVICE_ACCOUNT_JSON the admin app uses. Until that env is provisioned
// on this Vercel project (and the googleapis dep is added), this returns 501
// with a clear message — the browser-side CSV export (§5.2) handles the v1
// "get the results out of the app" path on its own.
// Create a Google Sheet from the current results and return its URL. Uses a
// service account (GOOGLE_SERVICE_ACCOUNT_JSON); the sheet is shared
// anyone-with-link (reader) so the requester can open it. Columns mirror the
// CSV export. Requires the Sheets + Drive APIs enabled on the service account.
async function handleExport(body, res, user) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    res.status(501).json({
      error: 'Google Sheets export is not configured on this deployment — set GOOGLE_SERVICE_ACCOUNT_JSON. Use "Copy as CSV" meanwhile.',
    });
    return;
  }
  let creds;
  try {
    creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch {
    res.status(500).json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.' });
    return;
  }
  const results = (body && body.results) || {};
  const rows = [...(results.buyReady || []), ...(results.stretch || [])];
  if (!rows.length) { res.status(400).json({ error: 'No results to export.' }); return; }

  const header = ['Domain', 'Price', 'Source', 'Status', 'Relevance', 'Bucket', 'Link'];
  const values = [header];
  for (const r of rows) {
    const bucket = r.bucket || (r.best_price != null ? 'Buy-ready' : 'Stretch');
    const relevance = Array.isArray(r.matched_keywords) ? r.matched_keywords.join(' / ') : '';
    values.push([
      r.domain || '',
      r.best_price == null ? 'TBD' : r.best_price,
      r.source_label || '',
      r.status || '',
      relevance,
      bucket,
      r.landing_url || '',
    ]);
  }
  const title = (typeof body.title === 'string' && body.title.trim())
    ? body.title.trim()
    : ('Naming — ' + (String(body.brief || '').replace(/\s+/g, ' ').slice(0, 60) || 'results'));

  const sharedId = (process.env.NAMING_EXPORT_SHEET_ID || '').trim();

  try {
    const { sheets: sheetsApi, auth: gauth } = await import('@googleapis/sheets');
    const { drive: driveApi } = await import('@googleapis/drive');
    const authClient = new gauth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
    });
    const sheets = sheetsApi({ version: 'v4', auth: authClient });
    const drive = driveApi({ version: 'v3', auth: authClient });

    // Preferred path: write into ONE workbook pre-shared with the service account
    // as Editor (env NAMING_EXPORT_SHEET_ID). A Google Workspace service account
    // cannot CREATE Drive files (no personal storage quota), but it CAN edit a
    // sheet a human already shared with it. Each export adds a fresh tab, so no
    // Drive create / permission grant is needed and nothing hits org policy.
    if (sharedId) {
      // Tab names: ≤100 chars, can't contain []*?/\: — sanitize + dedupe.
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      let tabBase = `${title} ${stamp}`.replace(/[\[\]\*\?\/\\:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
      if (!tabBase) tabBase = `Export ${stamp}`;
      let tabTitle = tabBase;
      let added;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          added = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sharedId,
            requestBody: { requests: [{ addSheet: { properties: { title: tabTitle } } }] },
          });
          break;
        } catch (e) {
          // Most likely a duplicate tab name — disambiguate and retry.
          if (/already exists|duplicate/i.test(e.message || '') && attempt < 4) {
            tabTitle = `${tabBase} (${attempt + 2})`.slice(0, 99);
            continue;
          }
          res.status(500).json({ error: `Couldn't add a tab to the export workbook (check NAMING_EXPORT_SHEET_ID and that it's shared with the service account as Editor): ${e.message || e}` });
          return;
        }
      }
      const newSheetId = added.data.replies[0].addSheet.properties.sheetId;
      const safeTab = `'${tabTitle.replace(/'/g, "''")}'`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: sharedId, range: `${safeTab}!A1`, valueInputOption: 'RAW', requestBody: { values },
      });
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sharedId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: 'userEnteredFormat.textFormat.bold',
            },
          }],
        },
      });
      const url = `https://docs.google.com/spreadsheets/d/${sharedId}/edit#gid=${newSheetId}`;
      res.status(200).json({ url, count: rows.length });
      return;
    }

    // Fallback: create a brand-new spreadsheet. Only works if the service account
    // can create Drive files (i.e. NOT a quota-less Workspace SA). If it can't,
    // surface a clear message pointing at the NAMING_EXPORT_SHEET_ID setup.
    let created;
    try {
      created = await sheets.spreadsheets.create({
        requestBody: { properties: { title }, sheets: [{ properties: { title: 'Results' } }] },
      });
    } catch (e) {
      res.status(500).json({ error: `Couldn't create the sheet (the service account likely can't create Drive files). Create one Google Sheet, share it with the service account's client_email as Editor, and set NAMING_EXPORT_SHEET_ID to its ID. (${e.message || e})` });
      return;
    }
    const spreadsheetId = created.data.spreadsheetId;
    const url = created.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    await sheets.spreadsheets.values.update({
      spreadsheetId, range: 'Results!A1', valueInputOption: 'RAW', requestBody: { values },
    });
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          repeatCell: {
            range: { sheetId: created.data.sheets[0].properties.sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        }],
      },
    });

    // Share so the requester can open it. Prefer a direct share to their email
    // (works within the Workspace even when public/"anyone" link-sharing is
    // blocked by org policy); fall back to anyone-with-link. Non-fatal: if both
    // are denied we still return the URL and flag it so the SA owner can grant
    // access, rather than failing the whole export.
    let shareWarning = null;
    const email = user && user.email ? String(user.email) : '';
    try {
      if (email) {
        await drive.permissions.create({
          fileId: spreadsheetId,
          sendNotificationEmail: false,
          requestBody: { role: 'writer', type: 'user', emailAddress: email },
        });
      } else {
        await drive.permissions.create({ fileId: spreadsheetId, requestBody: { role: 'reader', type: 'anyone' } });
      }
    } catch (e1) {
      try {
        await drive.permissions.create({ fileId: spreadsheetId, requestBody: { role: 'reader', type: 'anyone' } });
      } catch (e2) {
        shareWarning = `Sheet created but couldn't be shared automatically (${e1.message || e1}). Ask an admin to grant access, or relax Drive sharing policy.`;
      }
    }
    res.status(200).json({ url, count: rows.length, ...(shareWarning ? { warning: shareWarning } : {}) });
  } catch (e) {
    res.status(500).json({ error: `Sheets export failed: ${e.message || e}` });
  }
}
