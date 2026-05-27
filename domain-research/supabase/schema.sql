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

-- ── Standalone tool history (Trademark, Appraisal) ──────────────────────────
-- Backs the "recent 5" lists and deeplinks (/trademark/<q>, /appraisal/<d>) so
-- they persist across devices/sessions. One row per (kind, query); re-running
-- a query upserts that row rather than piling up duplicates.
create table if not exists domain_research_tool_lookups (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,                           -- tm | ap
  query      text not null,                           -- the SLD (tm) or domain (ap)
  data       jsonb,                                   -- saved result, re-rendered without re-running
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, query)
);
create index if not exists idx_dr_tool_lookups_kind on domain_research_tool_lookups (kind, updated_at desc);

-- ── Human-confirmed owners (feedback loop / eval set / known-owners cache) ──
-- One row per domain. Doubles as: a labeled eval set, a cache that seeds future
-- runs of the same domain as authoritative ground truth, and a feedback log.
create table if not exists domain_research_known_owners (
  id              uuid primary key default gen_random_uuid(),
  domain          text not null unique,
  was_correct     boolean,
  correct_owner   text,
  owner_type      text,
  correct_contact text,
  notes           text,
  run_id          uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Seed the cases we've cracked by hand (eval baseline + cache).
insert into domain_research_known_owners (domain, was_correct, correct_owner, owner_type, correct_contact, notes) values
  ('cove.com', false, 'William "Bill" Ostaski Jr. (Cove Communications) — deceased; domain likely held by estate/heirs', 'estate', 'bill@ostaski.net (historical)', 'Pre-privacy registrant 1995–2011; obituary indicates deceased — route contact to the estate/family.'),
  ('judy.com', false, 'Michael Gleissner (via Fnu Management / CKL Holdings shell network)', 'domain_investor', 'via CKL Holdings N.V. / his entities (no public personal email)', 'Opaque shell operator; no published personal contact.'),
  ('bngo.com', false, 'Najeb Alrefaie (operates the DomainMan.com portfolio)', 'domain_investor', 'najeb.alrefaie@gmail.com (verified via Whoxy reverse)', 'Listed on Atom, mirrored on domainman.com; identified via Quora→LinkedIn; email verified through whoxy_reverse.')
on conflict (domain) do nothing;

-- ── Refine-chat per report (also a feedback/eval transcript) ────────────────
create table if not exists domain_research_chat (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null,
  domain     text,
  role       text not null,                          -- user | assistant
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_dr_chat_run on domain_research_chat (run_id, created_at);

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
