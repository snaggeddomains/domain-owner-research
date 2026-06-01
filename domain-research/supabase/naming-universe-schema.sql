-- Schema additions for the NAMING-UNIVERSE Supabase project (the one with
-- name_universe + master_domain_list, NOT the main app Supabase).
--
-- Run this once on the project whose URL is in SUPABASE_NAMING_URL.

-- ── English word dictionary (for the inflection filter) ────────────────────
-- Loose-mode inflection filter on the naming chat — when the user asks for
-- "no plurals / past tense / -ing forms", we drop result SLDs that this
-- table flags as inflected (is_root = false). Unknown words (not in the
-- dictionary at all) PASS THROUGH so coined/technical names like saas.com
-- or fintech.com still surface.
--
-- Seed via scripts/seed-english-words.js with an AGID-format wordlist
-- (https://wordlist.aspell.net/agid-readme/) — public domain, ships lemma
-- + every regular and irregular inflected form with POS tags.
create table if not exists english_words (
  word    text primary key,           -- lowercase, ASCII
  is_root boolean not null default true,
  pos     text null                   -- 'noun' | 'verb' | 'adjective' | 'adverb' | null
);
create index if not exists idx_english_words_inflected
  on english_words (word) where is_root = false;

alter table english_words enable row level security;
-- Service-role queries bypass RLS; the runtime never reads this from the
-- client. No public policies on purpose.

-- ── Definitions for dictionary words (Free Dictionary API backfill) ────────
-- Adds a JSONB column populated by scripts/backfill-definitions.js. Shape:
--   {
--     "phonetic": "/dɪˈskeɪl/",                        -- optional, IPA
--     "senses": [
--       { "pos": "verb", "defs": ["Remove scale (deposits ...) from."] },
--       { "pos": "noun", "defs": ["..."] }
--     ],
--     "source":     "wiktionary",                       -- attribution
--     "fetched_at": "2026-06-01T00:00:00Z"
--   }
-- Surfaced in the Appraisal tool's render so a buyer can confirm a "premium
-- verb" / "evocative noun" claim against the actual dictionary meaning.
alter table english_words add column if not exists definition jsonb;
create index if not exists idx_english_words_definition_present
  on english_words (word) where definition is not null;
