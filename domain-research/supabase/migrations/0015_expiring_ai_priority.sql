-- Expiring .ai — scan PRIORITY so tech/AI-relevant names get RDAP-checked first.
--
-- .ai is a tech/AI TLD but the watchlist is seeded from a general English dictionary,
-- so a great name like `neural.ai` waited in the queue behind thousands of obscure
-- words. `priority` (2 = tech-relevant, 0 = plain dictionary word) reorders the scan:
-- among never-scanned names (last_checked IS NULL) the higher-priority ones go first.
-- No dictionary words are dropped — they're just scanned after the tech-relevant set.
--
-- Idempotent + safe to re-run. App degrades gracefully pre-migration (insertCandidate /
-- staleCandidates / upsertTechCandidates strip-and-retry the priority column/order).

alter table domain_research_expiring_ai add column if not exists priority smallint default 0;

-- Matches the scan order: staleCandidates pulls `last_checked asc nulls first, priority desc`.
create index if not exists idx_expiring_ai_scan_order
  on domain_research_expiring_ai (last_checked asc nulls first, priority desc);
