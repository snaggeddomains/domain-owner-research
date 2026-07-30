-- Expiring .ai — RocketReach enrichment of a PUBLIC registrant contact. On demand (a button
-- per row), we reverse-look-up the registrant's real email (and phone, if present) through
-- RocketReach to surface ADDITIONAL emails/phones + name/title/employer/LinkedIn. Cached here
-- so a re-view never re-spends a credit. Shape:
--   { emails:[], phones:[], name, title, employer, linkedin, location, enriched_at }
-- Run on the RESEARCH project. Degrades gracefully until it lands (the enrich action + windowList
-- strip-and-retry the column).
alter table domain_research_expiring_ai add column if not exists rr jsonb;
