#!/usr/bin/env node
// Seed the english_words table on the NAMING-UNIVERSE Supabase.
//
// Usage:
//   SUPABASE_NAMING_URL=https://...        \
//   SUPABASE_NAMING_SERVICE_KEY=sb_secret_ \
//   node scripts/seed-english-words.js <path-to-agid-infl.txt>
//
// Input: AGID (Automatically Generated Inflection Database) by Kevin
// Atkinson — public domain, ships with SCOWL. Each non-blank line is:
//
//   <lemma> <POS><variant>: <inflection> | <inflection> | ...
//
// e.g.
//   walk V: walks | walked | walking
//   require V: requires | required | requiring
//   foot N: feet
//
// Download: http://wordlist.aspell.net/agid-readme/  (file: infl.txt inside
// the SCOWL distribution, or directly from
// https://raw.githubusercontent.com/en-wl/wordlist/master/agid/infl.txt).
//
// Re-running is safe — we upsert on the word PRIMARY KEY. A second run with
// a larger wordlist just adds new rows.

import fs from 'node:fs';
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';

const POS_MAP = { V: 'verb', N: 'noun', A: 'adjective', V_: 'verb' };

function parsePosToken(token) {
  // The POS tag may be V, N, A, V_, etc. Strip trailing punctuation.
  const head = token.replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase();
  return POS_MAP[head] || null;
}

async function parseAgidFile(path) {
  // word → { is_root, pos } — collapsed so a word that appears as BOTH lemma
  // and inflected form (rare, but happens — e.g. "saw" is both a noun and
  // the past tense of "see") is treated as a root (loose-mode bias).
  const map = new Map();
  const stream = fs.createReadStream(path, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNo = 0;
  for await (const raw of rl) {
    lineNo++;
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Format: "<lemma> <POS-token>: <inflections separated by |>"
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const head = line.slice(0, colon).trim().split(/\s+/);
    if (head.length < 2) continue;
    const lemmaRaw = head[0];
    const pos = parsePosToken(head[1]);
    const tail = line.slice(colon + 1).trim();

    // Normalize to lowercase ASCII letters only. Skip multi-word lemmas,
    // accented forms, anything with punctuation — we're matching against
    // single-token SLDs.
    const lemma = lemmaRaw.toLowerCase();
    if (!/^[a-z]+$/.test(lemma)) continue;

    // Record the lemma as a root form (don't downgrade if already seen).
    if (!map.has(lemma) || map.get(lemma).is_root) {
      map.set(lemma, { is_root: true, pos: pos || (map.get(lemma)?.pos ?? null) });
    }

    for (const segRaw of tail.split('|')) {
      const seg = segRaw.trim();
      if (!seg) continue;
      // Inflections may include a comma-separated alternative like "trod, trodden".
      for (const word of seg.split(',')) {
        const w = word.trim().toLowerCase();
        if (!/^[a-z]+$/.test(w)) continue;
        if (w === lemma) continue;
        // Don't overwrite a recorded root — a word that's both root in one
        // line and inflected in another stays root (loose-mode).
        if (map.has(w) && map.get(w).is_root) continue;
        map.set(w, { is_root: false, pos: pos || null });
      }
    }
  }
  console.error(`parsed ${lineNo} lines → ${map.size} unique words`);
  return map;
}

async function main() {
  const url = process.env.SUPABASE_NAMING_URL;
  const key = process.env.SUPABASE_NAMING_SERVICE_KEY || process.env.SUPABASE_NAMING_SECRET_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_NAMING_URL / SUPABASE_NAMING_SERVICE_KEY env vars.');
    process.exit(1);
  }
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: node scripts/seed-english-words.js <path-to-agid-infl.txt>');
    process.exit(1);
  }
  if (!fs.existsSync(path)) {
    console.error(`File not found: ${path}`);
    process.exit(1);
  }

  const map = await parseAgidFile(path);
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Bulk upsert in batches. Supabase recommends ≤1000 rows per call for
  // PostgREST stability; 500 is a comfortable margin given each row is small.
  const BATCH = 500;
  const rows = [...map.entries()].map(([word, v]) => ({ word, is_root: v.is_root, pos: v.pos }));
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await client.from('english_words').upsert(chunk, { onConflict: 'word' });
    if (error) {
      console.error(`upsert failed at offset ${i}:`, error.message);
      process.exit(2);
    }
    inserted += chunk.length;
    if ((inserted % 5000) === 0 || inserted === rows.length) {
      console.error(`  upserted ${inserted} / ${rows.length}`);
    }
  }
  console.error(`done. inserted ${inserted} word rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
