// Tool subsystem endpoint — runs a single source AND serves the cached tool-
// history reads/writes the standalone Trademark/Appraisal tools depend on.
// Both live here so we stay under the Vercel Hobby plan's 12-function cap.
//
// Routing:
//   GET  /api/lookup?source=<name>&...      -> run a tool (spends credits)
//   GET  /api/lookup?kind=tm                -> recent 5 lookups of that kind
//   GET  /api/lookup?kind=tm&query=foo      -> one saved result
//   POST /api/lookup  { kind, query, data } -> upsert a saved result
// Presence of ?source= picks the run-tool path; otherwise it's history.

import { isAuthed, currentUser, userCan, moduleForSource } from '../lib/auth.js';
import { runTool } from '../lib/sources/index.js';
import { withCategory } from '../lib/db/usage.js';
import { cleanDomainInput } from '../lib/util.js';
import { saveToolLookup, listToolLookups, getToolLookup } from '../lib/db/tools.js';
import { getDefinitionWithFallback, sldOf } from '../lib/db/dictionary.js';

// Some tool-runs (e.g. registration_cluster, marketplace_check) need room.
export const config = { maxDuration: 60 };

// tm = trademark, ap = appraisal, mk = marketplace "for sale" strip (cached so
// re-opening a report doesn't re-spend Scrape.do credits on every view).
const KINDS = new Set(['tm', 'ap', 'mk', 'nb', 'at', 'ev', 'cv']);
const KIND_MODULE = { tm: 'trademark', ap: 'appraisal', mk: 'domain_owner', nb: 'domain_owner', at: 'appraisal', ev: 'evaluate', cv: 'domain_owner' };

// Sources shown in BOTH the Domain Owner and Appraisal reports — any signed-in
// user may run them regardless of which single module they're permitted.
const OPEN_SOURCES = new Set(['namebio_sales']);

async function handleRunTool(req, res, source) {
  // Gate by the module the source belongs to (trademark_search → trademark,
  // appraise_lookup → appraisal, others → domain_owner) — except OPEN_SOURCES.
  const user = await currentUser(req);
  if (!OPEN_SOURCES.has(source) && user && !userCan(user, moduleForSource(source))) {
    res.status(403).json({ error: `You don't have access to the ${moduleForSource(source)} module` });
    return;
  }
  const { source: _omit, ...rest } = req.query;
  const args = {};
  for (const [k, v] of Object.entries(rest)) args[k] = Array.isArray(v) ? v[0] : v;
  if (args.domain) {
    try {
      args.domain = cleanDomainInput(args.domain);
    } catch (e) {
      res.status(400).json({ error: String((e && e.message) || e) });
      return;
    }
  }

  // Tag cost to the module this tool belongs to (trademark_search → 'trademark',
  // appraise_lookup → 'appraisal', the rest → 'domain_owner').
  const result = await withCategory(moduleForSource(source), () => runTool(source, args, process.env));

  // Decorate successful appraisal responses with the SLD's dictionary entry
  // when we have one. The Appraisal LLM reasons heavily about word meaning
  // ("a powerful action verb", "dictionary-brand"); showing the actual
  // dictionary entry next to that reasoning lets a buyer corroborate it.
  // Read-only, fail-open, single indexed lookup — never blocks the appraisal.
  // The async job-poll request carries job_id but not domain, so fall back to a
  // domain on the result itself when args.domain is absent.
  const apDomain = args.domain
    || (result.data && (result.data.domain
      || (result.data.appraisal && result.data.appraisal.domain)
      || (result.data.valuation && result.data.valuation.domain)));
  if (result.ok && source === 'appraise_lookup' && apDomain) {
    try {
      const sld = sldOf(apDomain);
      if (sld) {
        const def = await getDefinitionWithFallback(sld);
        // Skip the "missing" 404 sentinel so the UI doesn't render an empty
        // section for words that aren't in the dictionary. Real definitions
        // (senses array non-empty) ride along on the response.
        if (def && Array.isArray(def.senses) && def.senses.length) {
          result.data = { ...(result.data || {}), definition: def };
        }
      }
    } catch {
      /* dictionary lookup is decorative — never block the appraisal */
    }
  }

  res.status(result.ok ? 200 : 400).json({ source, ...result });
}

async function handleHistory(req, res) {
  // Per-kind module-permission gate. POST kind lives in the body; GET in query.
  const user = await currentUser(req);
  const kindParam = (req.method === 'POST'
    ? (req.body && (typeof req.body === 'string' ? JSON.parse(req.body || '{}').kind : req.body.kind))
    : req.query.kind) || '';
  const mod = KIND_MODULE[String(kindParam)] || 'domain_owner';
  if (user && !userCan(user, mod)) {
    res.status(403).json({ error: `You don't have access to the ${mod} module` });
    return;
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const kind = String(body.kind || '');
    const query = String(body.query || '').trim();
    if (!KINDS.has(kind) || !query) {
      res.status(400).json({ error: 'Provide kind ("tm"|"ap"|"mk") and query' });
      return;
    }
    const id = await saveToolLookup(kind, query, body.data ?? null);
    res.status(200).json({ ok: true, id });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const kind = String(req.query.kind || '');
  if (!KINDS.has(kind)) {
    res.status(400).json({ error: 'Provide kind ("tm"|"ap"|"mk")' });
    return;
  }
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  if (query) {
    const row = await getToolLookup(kind, query);
    res.status(200).json({ found: Boolean(row), data: row ? row.data : null, updated_at: row ? row.updated_at : null });
    return;
  }
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 200);
  const lookups = await listToolLookups(kind, limit);
  res.status(200).json({ lookups });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const source = typeof req.query.source === 'string' ? req.query.source : '';
  if (source) return handleRunTool(req, res, source);
  return handleHistory(req, res);
}
