-- Migration 0005: net-new marker for the import-history log. Safe to re-run.
--
-- Records the import's START timestamp so the admin Imports tool can scope
-- enrichment + the per-import "enriched M/N" status to NET-NEW names only
-- (rows created at/after this time): universe by first_seen, master by
-- created_at. Without it we'd risk re-enriching names that already existed.

alter table domain_research_imports add column if not exists import_ts timestamptz;
