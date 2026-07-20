-- name_universe: `is_plural` enrichment flag.  Run in the NAMING project's SQL editor.
--
-- WHY: the dbsearch "exclude Plurals" filter is a SLD regex ([^suaio]s$) that catches
-- consonant+s plurals (cats, offences) but DELIBERATELY skips vowel+s (to avoid
-- false-flagging atlas/virus/canvas) — so it misses every plural whose singular ends in
-- a vowel (croatias←croatia, aleppos←aleppo, anorexias←anorexia). The NameClub import
-- surfaced ~30% such plurals. This flag catches them precisely: a plural = the SLD ends
-- in s/es/ies AND its singular is a real dictionary word (the english_words table, same
-- project). "atlas" → "atla" isn't a word → not flagged. dbsearch applies BOTH the regex
-- (covers not-yet-flagged rows) and `is_plural` (covers the vowel+s gap).

-- 1) Column + a partial index the search filter can use.
alter table name_universe add column if not exists is_plural boolean;
create index if not exists idx_universe_is_plural on name_universe (is_plural) where is_plural = true;

-- 2) Backfill. Idempotent + re-runnable (only flips still-unflagged rows), so re-run it
--    after big marketplace imports (e.g. NameClub). On the multi-million-row table run it
--    HERE in the SQL editor (longer statement timeout than the API); if it times out,
--    batch by first letter — add `and left(nu.sld,1) = 'a'` then 'b', 'c', …
update name_universe nu
set is_plural = true
where coalesce(nu.is_plural, false) = false
  and nu.sld ~ 's$'
  and (
        exists (select 1 from english_words e where e.word = left(nu.sld, length(nu.sld) - 1))                      -- cats→cat, croatias→croatia
     or (nu.sld ~ 'es$'  and exists (select 1 from english_words e where e.word = left(nu.sld, length(nu.sld) - 2)))       -- boxes→box
     or (nu.sld ~ 'ies$' and exists (select 1 from english_words e where e.word = left(nu.sld, length(nu.sld) - 3) || 'y'))-- parties→party
  );

-- Non-plurals stay NULL (not false) — cheaper, and dbsearch treats NULL as "keep" (the
-- regex still applies to them). Only genuine plurals are flipped to true.
