-- Domain Research — Supabase schema (Phase 1)
-- All tables use the domain_research_ prefix so they coexist with anything
-- else in this project. Run this once in the Supabase SQL Editor.
--
-- Access model: the app talks to Supabase server-side with the SECRET key
-- (service role), which bypasses RLS. RLS is enabled with no policies on every
-- table, so the publishable/anon key has no access — only the backend does.

create extension if not exists pgcrypto;

-- ── Run (one ownership investigation) ───────────────────────────────────────
create table if not exists domain_research_runs (
  id           uuid primary key default gen_random_uuid(),
  domain       text not null,
  depth        text not null default 'standard',   -- quick | standard | deep
  status       text not null default 'queued',      -- queued | running | done | error
  stage        text,                                -- current stage label
  question     text,
  error        text,
  report       jsonb,                               -- final rendered report (see SPEC §8)
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index if not exists idx_dr_runs_domain on domain_research_runs (domain);
create index if not exists idx_dr_runs_status on domain_research_runs (status);

-- ── Raw responses (drill-down: the bytes behind every conclusion) ────────────
create table if not exists domain_research_raw_responses (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references domain_research_runs(id) on delete cascade,
  source       text not null,                       -- rdap | dns | wayback | domainiq | ...
  url          text,
  status_code  int,
  body         jsonb,
  fetched_at   timestamptz not null default now()
);
create index if not exists idx_dr_raw_run on domain_research_raw_responses (run_id);

-- ── Normalized ownership entities ───────────────────────────────────────────
create table if not exists domain_research_organizations (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references domain_research_runs(id) on delete cascade,
  name       text not null,
  source_ids uuid[] default '{}'
);
create index if not exists idx_dr_org_run on domain_research_organizations (run_id);

create table if not exists domain_research_contacts (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references domain_research_runs(id) on delete cascade,
  type       text not null,                         -- email | phone
  value      text not null,
  source_ids uuid[] default '{}'
);
create index if not exists idx_dr_contacts_run on domain_research_contacts (run_id);

create table if not exists domain_research_registrants (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references domain_research_runs(id) on delete cascade,
  name        text,
  org_id      uuid references domain_research_organizations(id) on delete set null,
  email       text,
  privacy     boolean not null default false,
  first_seen  date,
  last_seen   date,
  source_ids  uuid[] default '{}'
);
create index if not exists idx_dr_registrants_run on domain_research_registrants (run_id);

create table if not exists domain_research_nameservers (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references domain_research_runs(id) on delete cascade,
  host           text not null,
  provider_guess text,
  first_seen     date,
  last_seen      date,
  source_ids     uuid[] default '{}'
);
create index if not exists idx_dr_ns_run on domain_research_nameservers (run_id);

create table if not exists domain_research_registrar_events (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references domain_research_runs(id) on delete cascade,
  registrar  text,
  event      text,                                  -- creation | transfer | update | expiry
  date       date,
  source_ids uuid[] default '{}'
);
create index if not exists idx_dr_regevents_run on domain_research_registrar_events (run_id);

-- ── Timeline & ownership eras ───────────────────────────────────────────────
create table if not exists domain_research_timeline_events (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references domain_research_runs(id) on delete cascade,
  date       date,
  kind       text,                                  -- registrant | org | email | registrar | ns | privacy
  from_value text,
  to_value   text,
  source_ids uuid[] default '{}'
);
create index if not exists idx_dr_timeline_run on domain_research_timeline_events (run_id);

create table if not exists domain_research_ownership_eras (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references domain_research_runs(id) on delete cascade,
  start_date    date,
  end_date      date,
  likely_holder text,
  basis         text,
  source_ids    uuid[] default '{}'
);
create index if not exists idx_dr_eras_run on domain_research_ownership_eras (run_id);

-- ── Live-site signals (Stage 4) ─────────────────────────────────────────────
create table if not exists domain_research_site_signals (
  id        uuid primary key default gen_random_uuid(),
  run_id    uuid not null references domain_research_runs(id) on delete cascade,
  kind      text not null,                          -- company | email | phone | social | address | copyright | lander
  value     text,
  source_id uuid references domain_research_raw_responses(id) on delete set null
);
create index if not exists idx_dr_signals_run on domain_research_site_signals (run_id);

create table if not exists domain_research_analytics_ids (
  id        uuid primary key default gen_random_uuid(),
  run_id    uuid not null references domain_research_runs(id) on delete cascade,
  type      text not null,                          -- ga | gtm | meta_pixel | segment | other
  value     text not null,
  source_id uuid references domain_research_raw_responses(id) on delete set null
);
create index if not exists idx_dr_analytics_run on domain_research_analytics_ids (run_id);
-- Cross-domain footprint: find other runs that shared an analytics ID.
create index if not exists idx_dr_analytics_value on domain_research_analytics_ids (type, value);

-- ── Archive (Stage 5) ───────────────────────────────────────────────────────
create table if not exists domain_research_archive_snapshots (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references domain_research_runs(id) on delete cascade,
  timestamp  text,                                  -- wayback timestamp (YYYYMMDDhhmmss)
  status     int,
  role       text,                                  -- company | contact | parked | personal
  note       text,
  url        text
);
create index if not exists idx_dr_archive_run on domain_research_archive_snapshots (run_id);

-- ── Marketplace & valuation (Stages 6–7) ────────────────────────────────────
create table if not exists domain_research_marketplace_listings (
  id        uuid primary key default gen_random_uuid(),
  run_id    uuid not null references domain_research_runs(id) on delete cascade,
  channel   text not null,                          -- afternic | godaddy | sedo | atom | efty
  listed    boolean,
  price     numeric,
  currency  text,
  broker    text,
  url       text,
  source_id uuid references domain_research_raw_responses(id) on delete set null
);
create index if not exists idx_dr_market_run on domain_research_marketplace_listings (run_id);

create table if not exists domain_research_comps (
  id        uuid primary key default gen_random_uuid(),
  run_id    uuid not null references domain_research_runs(id) on delete cascade,
  name      text,
  price     numeric,
  sold_date date,
  source_id uuid references domain_research_raw_responses(id) on delete set null
);
create index if not exists idx_dr_comps_run on domain_research_comps (run_id);

create table if not exists domain_research_valuations (
  id        uuid primary key default gen_random_uuid(),
  run_id    uuid not null references domain_research_runs(id) on delete cascade,
  estimate  numeric,
  basis     text,
  source_id uuid references domain_research_raw_responses(id) on delete set null
);
create index if not exists idx_dr_valuations_run on domain_research_valuations (run_id);

-- ── Evidence vs inference (Stage 8 synthesis) ───────────────────────────────
create table if not exists domain_research_evidence_items (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references domain_research_runs(id) on delete cascade,
  tag        text not null,                         -- hard | signal
  statement  text not null,
  source_ids uuid[] default '{}'
);
create index if not exists idx_dr_evidence_run on domain_research_evidence_items (run_id);

create table if not exists domain_research_inferences (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references domain_research_runs(id) on delete cascade,
  statement    text not null,
  evidence_ids uuid[] default '{}',
  confidence   text                                 -- high | med | low
);
create index if not exists idx_dr_inferences_run on domain_research_inferences (run_id);

-- ── Enable RLS (no policies → backend secret key only) ──────────────────────
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename like 'domain_research_%'
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;
