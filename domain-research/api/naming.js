import { isAuthed, currentUser, userCan } from '../lib/auth.js';
import { isNamingDbConfigured } from '../lib/db/supabase-naming.js';
import { parseBrief, draftBrief } from '../lib/naming/brief.js';
import { cullOffBrief } from '../lib/naming/cull.js';
import { searchUniverse } from '../lib/naming/query.js';
import { sweepVariations } from '../lib/variations/sweep.js';
import { pickAffixes } from '../lib/variations/affixes.js';
import { runNamingChatTurn } from '../lib/naming/chat.js';
import { saveNamingRun, updateNamingRun, listNamingRuns, getNamingRun, renameNamingRun, setNamingRunStar } from '../lib/db/naming-runs.js';
import { listNamingChat, addNamingChatMessage } from '../lib/db/naming-chat.js';
import { fetchText, extractClues } from '../lib/util.js';
import { withCategory } from '../lib/db/usage.js';
import { getFreshLiveChecks, saveLiveChecks } from '../lib/db/livechecks.js';
import { createSheet, gsheetExportConfigured } from '../lib/gsheet.js';

// 120s: the variations sweep for a BUSY word (many for-sale names needing
// marketplace price lookups + many active sites to crawl) can push past 60s.
export const config = { maxDuration: 120 };

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

  if (action === 'draft_brief') return handleDraftBrief(body, res, user);
  if (action === 'cull') return handleCull(body, res, user);
  if (action === 'search') return handleSearch(body, res, user);
  if (action === 'variations') return handleVariations(body, res, user);
  if (action === 'export') return handleExport(body, res, user);
  if (action === 'chat') return handleChat(body, res, user);
  if (action === 'rename') return handleRename(body, res, user);
  if (action === 'star') return handleStar(body, res, user);
  if (action === 'verify') return handleVerify(body, res, user);
  res.status(400).json({ error: `Unknown action: ${action}` });
}

// Brand-variation sweep — enumerate a LOCKED word's prefix/suffix/TLD variations
// and check each live for for-sale status + price (crawl/DomainScout) and
// availability (DNS). The tool for a client committed to their name (the theme
// search can't hold a word fixed). Persisted as a naming_run (filters.mode =
// 'variations') so it shows in Recent and can be reopened like a theme run.
async function handleVariations(body, res, user) {
  const seed = String(body.seed || '').trim();
  if (!seed) { res.status(400).json({ error: 'Enter a word to build variations around (e.g. "sentinel").' }); return; }
  if (!/[a-z0-9]/i.test(seed) || seed.replace(/[^a-z0-9]/gi, '').length < 2) {
    res.status(400).json({ error: 'That doesn’t look like a usable brand word.' }); return;
  }
  const excludeTlds = Array.isArray(body.exclude_tlds) ? body.exclude_tlds.map((t) => String(t)) : [];
  // Extra TLDs to also run the prefix/suffix combos on (beyond .com) — e.g. ['ai'].
  const affixTlds = Array.isArray(body.affix_tlds) ? body.affix_tlds.map((t) => String(t).replace(/^\./, '').toLowerCase()).filter(Boolean).slice(0, 8) : [];
  const industry = String(body.industry || '').trim().slice(0, 80);
  const website = String(body.website || '').trim().slice(0, 200);
  const runId = typeof body.run_id === 'string' && body.run_id ? body.run_id : null;
  const title = (typeof body.title === 'string' && body.title.trim()) ? body.title.trim() : null;
  try {
    const out = await withCategory('naming', async () => {
      // Word-aware affixes, optionally sharpened by industry + current website —
      // fail-open to defaults. Either also adds fitting niche TLDs (dart + healthcare
      // → dart.health).
      const { prefixes, suffixes, tlds } = await pickAffixes(seed, process.env, { industry, website }).catch(() => ({}));
      const r = await sweepVariations(seed, { env: process.env, excludeTlds, prefixes, suffixes, extraTlds: tlds, affixTlds });
      r.industry = industry || null;
      r.website = website || null;
      return r;
    });
    // Persist so it lands in Recent + is reopenable (best-effort — never block the
    // result on a DB hiccup). Results ride in buy_ready; filters carries the mode.
    try {
      const filters = { mode: 'variations', seed, industry: industry || null, website: website || null, affix_tlds: affixTlds, criteria: out.criteria || null };
      const payload = { user_id: user && user.id, brief: seed, filters, buyReady: out.results, stretch: [], title: title || seed };
      const saved = runId ? await updateNamingRun(runId, payload) : await saveNamingRun(payload);
      if (saved && saved.id) { out.run_id = saved.id; out.created_at = saved.created_at; }
      else if (runId) out.run_id = runId;
    } catch (e) { console.error('variations save failed:', e && e.message); }
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}

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

// Render a page through scrape.do (residential IP + JS render) to get past a
// Cloudflare/WAF 403 or a JS-only shell. Same provider the marketplace check
// uses. Returns rendered HTML or null when unavailable.
async function scrapeRender(domain) {
  const key = process.env.SCRAPE_DO_API_KEY;
  if (!key) return null;
  try {
    const api = `https://api.scrape.do/?token=${encodeURIComponent(key)}`
      + `&render=true&super=true&customWait=3500&url=${encodeURIComponent(`https://${domain}/`)}`;
    const r = await fetchText(api, {}, 20000);
    if (r.status === 200 && r.body && r.body.length > 500) return r.body;
  } catch { /* render unavailable */ }
  return null;
}

async function verifyDomain(domain) {
  const d = String(domain || '').toLowerCase().trim();
  if (!d) return 'unclear';
  let status = 0;
  let firstCall = 'unclear';
  try {
    const r = await fetchText(`https://${d}/`, {}, 6000);
    status = r.status;
    firstCall = classifyClues(extractClues(r.body || ''), r.status);
  } catch {
    firstCall = 'unclear'; // unreachable
  }
  // The plain fetch is inconclusive when the site blocks the crawler (401/403/
  // 429) or returns a JS shell (→ 'unclear'). Escalate THOSE through scrape.do
  // to read the real page and confirm (a Cloudflare-fronted for-sale lander
  // would then classify 'for_sale' and stay; a real company → 'in_use').
  const blocked = status === 401 || status === 403 || status === 429;
  if (blocked || firstCall === 'unclear') {
    const html = await scrapeRender(d);
    if (html) {
      const confirmed = classifyClues(extractClues(html), 200);
      if (confirmed !== 'unclear') return confirmed;
    }
  }
  return firstCall; // heuristic call stands (403 → in_use) when no render available
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

// Apply the UI filter panel onto a filter object IN PLACE. The panel is
// authoritative over whatever the brief inferred. Used by both search and chat
// so a chat refinement starts from the SAME constraints the user currently sees
// (esp. TLD), instead of stale saved run filters.
function applyUiFilters(filters, body) {
  if (Array.isArray(body.connotation)) {
    const VALID = ['positive', 'somewhat positive', 'neutral', 'somewhat negative', 'negative'];
    const picked = [...new Set(body.connotation.map((c) => String(c || '').toLowerCase()).filter((c) => VALID.includes(c)))];
    filters.connotation = picked.length === 0 || picked.length >= VALID.length ? null : picked;
  }
  if (Array.isArray(body.part_of_speech)) {
    const VALID_POS = ['noun', 'verb', 'adjective', 'adverb'];
    const picked = [...new Set(body.part_of_speech.map((p) => String(p || '').toLowerCase()).filter((p) => VALID_POS.includes(p)))];
    filters.part_of_speech = picked.length === 0 || picked.length >= VALID_POS.length ? null : picked;
  }
  if (Array.isArray(body.tlds) && body.tlds.length) {
    const tlds = body.tlds.map((t) => String(t).replace(/^\./, '').toLowerCase()).filter(Boolean);
    if (tlds.length) filters.tlds = [...new Set(tlds)];
  }
  if (Array.isArray(body.exclude)) {
    const VALID_FORMS = ['plural', 'past', 'ing', 'ly'];
    filters.exclude_forms = [...new Set(body.exclude.map((f) => String(f || '').toLowerCase()).filter((f) => VALID_FORMS.includes(f)))];
  }
  const uiNum = (v) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : null);
  if (body.price_min !== undefined && uiNum(body.price_min) != null) filters.min_price = uiNum(body.price_min);
  if (body.price_max !== undefined && uiNum(body.price_max) != null) filters.max_price = uiNum(body.price_max);
  const uiInt = (v) => { const n = uiNum(v); return n == null ? null : Math.round(n); };
  if (body.len_min !== undefined && uiInt(body.len_min) != null) filters.sld_length_min = uiInt(body.len_min);
  if (body.len_max !== undefined && uiInt(body.len_max) != null) filters.sld_length_max = uiInt(body.len_max);
  if (body.syllables_min !== undefined && uiInt(body.syllables_min) != null) filters.syllables_min = uiInt(body.syllables_min);
  if (body.syllables_max !== undefined && uiInt(body.syllables_max) != null) filters.syllables_max = uiInt(body.syllables_max);
  if (
    (body.words_min !== undefined && uiInt(body.words_min) != null) ||
    (body.words_max !== undefined && uiInt(body.words_max) != null)
  ) {
    filters.num_words = null;
    if (body.words_min !== undefined && uiInt(body.words_min) != null) filters.num_words_min = uiInt(body.words_min);
    if (body.words_max !== undefined && uiInt(body.words_max) != null) filters.num_words_max = uiInt(body.words_max);
  }
  return filters;
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
  // The live filter panel (sent with each chat turn) is authoritative over the
  // saved run filters — so a refinement starts from exactly what the user sees
  // (especially TLD) and can't silently widen it. Clone so we don't mutate the
  // stored snapshot.
  currentRun.filters = applyUiFilters({ ...(currentRun.filters || {}) }, body);

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
    const turn = await withCategory('naming', () => runNamingChatTurn({ run: currentRun, history, message, env: process.env }));
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

// Turn rough notes / a pasted doc / reference names into a polished theme brief.
async function handleDraftBrief(body, res, user) {
  const context = typeof body.context === 'string' ? body.context.trim() : '';
  // source: 'transcript' → mine a raw meeting transcript (Granola); else 'notes'.
  const source = body.source === 'transcript' ? 'transcript' : 'notes';
  if (!context) {
    res.status(400).json({ error: source === 'transcript'
      ? 'Paste your meeting notes / transcript first.'
      : 'Add a few notes (or paste a brief / names you like) first.' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) { res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY' }); return; }
  try {
    const brief = await withCategory('naming', () => draftBrief(context, process.env, { source }));
    res.status(200).json({ brief });
  } catch (e) {
    res.status(502).json({ error: `Couldn't draft a brief: ${e.message || e}` });
  }
}

// Off-brief cull — flag candidates that are wildly off-scope for the brief (the
// in-tool version of the manual "paste the CSV into an LLM, mark an X" step).
// Reads brief + domains from the body (client has them) or, as a fallback, from
// the saved run. Persists the off-brief set onto the run's filters jsonb (no
// migration) so it survives reload. Gated by research.naming (same as search).
async function handleCull(body, res, user) {
  const runId = typeof body.run_id === 'string' && body.run_id ? body.run_id : null;
  let brief = typeof body.brief === 'string' ? body.brief.trim() : '';
  let domains = Array.isArray(body.domains) ? body.domains.filter((d) => typeof d === 'string') : null;
  if (!process.env.ANTHROPIC_API_KEY) { res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY' }); return; }
  // Fall back to the saved run for brief/domains if the client didn't send them.
  if ((!brief || !domains || !domains.length) && runId) {
    const run = await getNamingRun(runId).catch(() => null);
    if (run) {
      if (!brief) brief = String(run.brief || '');
      if (!domains || !domains.length) {
        const rows = [...(Array.isArray(run.buy_ready) ? run.buy_ready : []), ...(Array.isArray(run.stretch) ? run.stretch : [])];
        domains = rows.map((r) => r && r.domain).filter(Boolean);
      }
    }
  }
  if (!brief) { res.status(400).json({ error: 'A brief is required to judge off-brief names.' }); return; }
  if (!domains || !domains.length) { res.status(400).json({ error: 'No candidates to review.' }); return; }
  try {
    const off = await withCategory('naming', () => cullOffBrief(brief, domains, process.env));
    // Best-effort persist onto the run so the flags survive a reload.
    if (runId) {
      try {
        const run = await getNamingRun(runId);
        if (run) await updateNamingRun(runId, { filters: { ...(run.filters || {}), off_brief: off } });
      } catch { /* persist is best-effort — the client still gets the result */ }
    }
    res.status(200).json({ off_brief: off, reviewed: domains.length });
  } catch (e) {
    res.status(502).json({ error: `Couldn't review off-brief names: ${e.message || e}` });
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
    filters = await withCategory('naming', () => parseBrief(brief, process.env));
  } catch (e) {
    res.status(502).json({ error: `Couldn't parse your brief: ${e.message || e}` });
    return;
  }
  // Layer the UI filter panel (TLDs, connotation, price/length/syllable/word
  // bounds, word-form exclusions) onto the brief-parsed filters — the panel is
  // authoritative. Shared with handleChat so refinements respect the live panel.
  applyUiFilters(filters, body);
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

// Google Sheets export (§5.1). This app holds NO Google credentials — admin owns
// the service account + the "Snagged Pipeline" shared drive — so we POST the rows
// to admin's internal endpoint (/api/internal/naming-sheet, lib/gsheet.js) which
// creates the sheet and returns its URL. Same server-to-server shared-secret pattern
// as the email-threads / sales-comps / valuate cross-app calls. Columns mirror the
// CSV export; the sheet is shared to the requesting user as writer. Returns 501 when
// the cross-app secret isn't set (browser-side "Copy as CSV" still works standalone).
async function handleExport(body, res, user) {
  if (!gsheetExportConfigured()) {
    res.status(501).json({
      error: 'Google Sheets export is not configured — set RESEARCH_INTERNAL_SECRET (+ ADMIN_INTERNAL_BASE). Use "Copy as CSV" meanwhile.',
    });
    return;
  }
  const results = (body && body.results) || {};
  const rows = [...(results.buyReady || []), ...(results.stretch || [])];
  if (!rows.length) { res.status(400).json({ error: 'No results to export.' }); return; }

  // "Off-brief" mirrors the in-tool cull's X column — from the off-brief set the
  // client carries on results.filters.off_brief (set after a cull), blank otherwise.
  const offSet = new Set(
    (results.filters && Array.isArray(results.filters.off_brief) ? results.filters.off_brief : [])
      .map((d) => String(d || '').toLowerCase()),
  );
  const isOff = (r) => offSet.has(String(r && r.domain || '').toLowerCase());
  // Off-brief names sort to the BOTTOM (stable — each partition keeps its order), so the
  // culled block is contiguous at the end (and its gray+strike range coalesces to one).
  const ordered = [...rows.filter((r) => !isOff(r)), ...rows.filter((r) => isOff(r))];
  const header = ['Domain', 'Price', 'Source', 'Status', 'Off-brief', 'Relevance', 'Bucket', 'Link'];
  const PRICE_COL = 1; // 0-based index of the Price column → formatted as USD (no decimals)
  const values = [header];
  const dimRows = []; // 0-based DATA-row indices (header excluded) that are off-brief
  ordered.forEach((r, i) => {
    const bucket = r.bucket || (r.best_price != null ? 'Buy-ready' : 'Stretch');
    const relevance = Array.isArray(r.matched_keywords) ? r.matched_keywords.join(' / ') : '';
    const off = offSet.has(String(r.domain || '').toLowerCase());
    if (off) dimRows.push(i);
    values.push([
      r.domain || '',
      r.best_price == null ? 'TBD' : Number(r.best_price), // keep numeric so the currency format renders
      r.source_label || '',
      r.status || '',
      off ? 'X' : '',
      relevance,
      bucket,
      r.landing_url || '',
    ]);
  });
  const title = (typeof body.title === 'string' && body.title.trim())
    ? body.title.trim()
    : ('Naming — ' + (String(body.brief || '').replace(/\s+/g, ' ').slice(0, 60) || 'results'));

  try {
    const data = await createSheet({
      title,
      values,
      shareWith: user && user.email ? String(user.email) : undefined,
      formats: { currencyColumns: [PRICE_COL], dimRows, filter: true },
    });
    res.status(200).json({ url: data.url, count: rows.length, ...(data.warning ? { warning: data.warning } : {}) });
  } catch (e) {
    res.status(500).json({ error: `Sheets export failed: ${e.message || e}` });
  }
}
