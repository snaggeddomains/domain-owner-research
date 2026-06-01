#!/usr/bin/env node
// Backfill english_words.definition from the Free Dictionary API
// (dictionaryapi.dev — Wiktionary-derived, no key, free).
//
// Resumable: only fills rows where definition IS NULL. Re-running the script
// picks up where it left off. Safe to interrupt and resume.
//
// Usage:
//   SUPABASE_NAMING_URL=... \
//   SUPABASE_NAMING_SERVICE_KEY=... \
//   node scripts/backfill-definitions.js [--limit N] [--concurrency C]
//
// Options:
//   --limit N         Stop after processing N words (default: all is_root rows with null definition).
//   --concurrency C   Parallel in-flight requests (default 6). The API is
//                     free + community-run — keep this modest.
//   --pos-only        Skip words without a POS tag in english_words (slightly
//                     cleaner dataset; you'll miss some).

import { createClient } from '@supabase/supabase-js';

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const SCAN_BATCH = 500;        // how many candidates to pull per Supabase query
const WRITE_BATCH = 50;         // how many definitions to upsert in one round-trip
const MAX_SENSES = 2;           // cap on POS senses per word (verb + noun, etc.)
const MAX_DEFS_PER_SENSE = 2;   // cap on definitions per POS sense

function parseArgs(argv) {
  const out = { limit: Infinity, concurrency: 6, posOnly: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') out.limit = Math.max(1, parseInt(argv[++i], 10) || Infinity);
    else if (a === '--concurrency') out.concurrency = Math.max(1, Math.min(20, parseInt(argv[++i], 10) || 6));
    else if (a === '--pos-only') out.posOnly = true;
  }
  return out;
}

// Cleaned-up dictionary entry derived from the Free Dictionary API response.
// Returns null when the API gave nothing usable for this word — caller stores
// nothing so the row stays null and a later run can retry it.
function shapeDefinition(apiResponse) {
  if (!Array.isArray(apiResponse) || !apiResponse.length) return null;
  const first = apiResponse[0] || {};
  const phonetic =
    (typeof first.phonetic === 'string' && first.phonetic) ||
    (Array.isArray(first.phonetics) && (first.phonetics.find((p) => p && p.text) || {}).text) ||
    null;
  const meanings = Array.isArray(first.meanings) ? first.meanings : [];
  const senses = [];
  for (const m of meanings) {
    if (!m || !Array.isArray(m.definitions) || !m.definitions.length) continue;
    const defs = m.definitions
      .map((d) => (d && typeof d.definition === 'string' ? d.definition.trim() : ''))
      .filter(Boolean)
      .slice(0, MAX_DEFS_PER_SENSE);
    if (!defs.length) continue;
    senses.push({ pos: String(m.partOfSpeech || '').trim() || null, defs });
    if (senses.length >= MAX_SENSES) break;
  }
  if (!senses.length) return null;
  return {
    phonetic,
    senses,
    source: 'wiktionary',
    fetched_at: new Date().toISOString(),
  };
}

// Sentinel object stored as the row's definition when the API returns 404
// or an empty body for a word. Distinguishes "we tried and there's nothing"
// from "we haven't tried yet" — the second run skips these instead of
// hammering the API for the same dead ends.
function shapeMissing() {
  return { missing: true, source: 'wiktionary', fetched_at: new Date().toISOString(), senses: [] };
}

async function fetchOne(word) {
  const url = `${API_BASE}/${encodeURIComponent(word)}`;
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.status === 404) return shapeMissing();
    if (!res.ok) return null; // transient error — leave row null so the next run retries
    const body = await res.json();
    const shaped = shapeDefinition(body);
    return shaped || shapeMissing();
  } catch {
    return null;
  }
}

// Bounded-concurrency mapper. Keeps `concurrency` requests in flight at once,
// resolving and dispatching the next as each completes.
async function mapPool(items, concurrency, worker, onProgress) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  async function run() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      done++;
      if (onProgress) onProgress(done, items.length);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, run);
  await Promise.all(workers);
  return results;
}

async function main() {
  const url = process.env.SUPABASE_NAMING_URL;
  const key = process.env.SUPABASE_NAMING_SERVICE_KEY || process.env.SUPABASE_NAMING_SECRET_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_NAMING_URL / SUPABASE_NAMING_SERVICE_KEY env vars.');
    process.exit(1);
  }
  const args = parseArgs(process.argv);
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  console.error(`backfill-definitions: concurrency=${args.concurrency} limit=${args.limit === Infinity ? 'all' : args.limit}${args.posOnly ? ' (pos-only)' : ''}`);

  let totalProcessed = 0;
  let totalHit = 0;
  let totalMissed = 0;

  while (totalProcessed < args.limit) {
    // Pull the next batch of words that haven't been processed yet. A "null
    // definition" means we haven't attempted this row — including 404 results
    // (which write the missing sentinel) means we won't re-fetch dead ends.
    let q = client
      .from('english_words')
      .select('word')
      .eq('is_root', true)
      .is('definition', null)
      .order('word', { ascending: true })
      .limit(Math.min(SCAN_BATCH, args.limit - totalProcessed));
    if (args.posOnly) q = q.not('pos', 'is', null);
    const { data: candidates, error } = await q;
    if (error) {
      console.error('Supabase scan failed:', error.message);
      process.exit(2);
    }
    if (!candidates || !candidates.length) {
      console.error('No more candidates — backfill complete.');
      break;
    }

    const words = candidates.map((r) => r.word);
    process.stderr.write(`fetching definitions for ${words.length} words…\n`);

    const fetched = await mapPool(words, args.concurrency, fetchOne, (done, total) => {
      if (done % 25 === 0 || done === total) {
        process.stderr.write(`  ${done}/${total}\r`);
      }
    });
    process.stderr.write('\n');

    // Build the upsert batch — pair each word with whatever the API said.
    // Rows where fetchOne returned null (transient error) are skipped so the
    // next run picks them up; rows with the missing sentinel ARE written so
    // we don't re-fetch confirmed dead ends.
    const updates = [];
    for (let i = 0; i < words.length; i++) {
      const def = fetched[i];
      if (def === null) continue;
      updates.push({ word: words[i], definition: def });
      if (def.missing) totalMissed++;
      else totalHit++;
    }

    // Write in chunks via upsert on the primary key (word).
    for (let i = 0; i < updates.length; i += WRITE_BATCH) {
      const chunk = updates.slice(i, i + WRITE_BATCH);
      const { error: upErr } = await client.from('english_words').upsert(chunk, { onConflict: 'word' });
      if (upErr) {
        console.error(`upsert failed at offset ${i}:`, upErr.message);
        process.exit(3);
      }
    }

    totalProcessed += words.length;
    console.error(`  batch done: ${updates.length} upserted (${totalHit} with definitions, ${totalMissed} 404 sentinels) · totalProcessed=${totalProcessed}`);
  }

  console.error(`\ndone. processed ${totalProcessed} words → ${totalHit} with definitions, ${totalMissed} confirmed-missing.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
