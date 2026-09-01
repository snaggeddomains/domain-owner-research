-- Naming "verify listings" pass caches the LIVE marketplace asking price alongside
-- the live for-sale/in-use classification, so a corpus-vs-live price mismatch can be
-- flagged without re-fetching the lander every time. Additive to domain_research_live_checks
-- (the app strip-and-retries these columns, so it works before this runs — just no cached price).
alter table domain_research_live_checks add column if not exists live_price numeric;
alter table domain_research_live_checks add column if not exists live_currency text;
