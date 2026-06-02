-- Migration 0004: import-history log for the admin Imports tool. Safe to re-run.
--
-- Records each domain import run (Universe or Master) so the admin panel can
-- show recent activity: what source, which mode, how many rows parsed/written/
-- removed, whether a structural+quality backfill was dispatched, and by whom.
-- Lives in the MAIN research project (same as domain_research_users), written
-- server-side via the service-role key (RLS on, no anon policy).

create table if not exists domain_research_imports (
  id          uuid primary key default gen_random_uuid(),
  target      text not null,                 -- 'universe' | 'master'
  source      text not null,                 -- the source tag this import wrote
  mode        text not null,                 -- 'merge' | 'replace'
  parsed      integer not null default 0,    -- valid domains parsed from the file
  upserted    integer not null default 0,    -- rows written
  removed     integer not null default 0,    -- stale rows deleted (replace mode)
  backfilled  boolean not null default false,-- structural/quality backfill dispatched
  user_email  text,                          -- who ran it
  created_at  timestamptz not null default now()
);

create index if not exists idx_dr_imports_created on domain_research_imports (created_at desc);

alter table public.domain_research_imports enable row level security;
