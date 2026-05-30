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
