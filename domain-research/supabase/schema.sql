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
  content    text,                                   -- empty while a turn is pending
  status     text not null default 'done',           -- pending | done | error
  created_at timestamptz not null default now()
);
create index if not exists idx_dr_chat_run on domain_research_chat (run_id, created_at);
-- If the table predates async chat, add the column:
alter table domain_research_chat add column if not exists status text not null default 'done';
alter table domain_research_chat alter column content drop not null;

-- ── Users (Phase 1 multi-user auth) ─────────────────────────────────────────
create table if not exists domain_research_users (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null unique,
  password_hash         text not null,
  is_admin              boolean not null default false,
  permissions           jsonb not null default '{"domain_owner": true, "trademark": true, "appraisal": true, "naming": false}'::jsonb,
  email_notify_on_done  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz
);
create unique index if not exists idx_dr_users_email_lower on domain_research_users (lower(email));
-- Self-serve profile name fields (2026-06).
alter table domain_research_users add column if not exists first_name text;
alter table domain_research_users add column if not exists last_name text;
-- Per-channel report-ready notification prefs (email already existed; bell 2026-06).
alter table domain_research_users add column if not exists notify_in_app boolean not null default true;

-- In-app notifications (the bell). One row per completed task; the bell shows
-- the unread count + a recent list that deep-links into the app (2026-06).
create table if not exists domain_research_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references domain_research_users(id) on delete cascade,
  kind        text not null default 'report',
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_dr_notif_user on domain_research_notifications (user_id, created_at desc);
create index if not exists idx_dr_notif_unread on domain_research_notifications (user_id) where read_at is null;

-- 24h cache of the naming "is it actually for sale?" live classification (2026-06).
create table if not exists domain_research_live_checks (
  domain      text primary key,
  status      text not null,
  checked_at  timestamptz not null default now()
);

-- Tie each run back to the user that triggered it (for per-user history + email notifications).
alter table domain_research_runs
  add column if not exists user_id uuid references domain_research_users(id) on delete set null;
create index if not exists idx_dr_runs_user on domain_research_runs (user_id);

-- ── Naming Exercise runs ───────────────────────────────────────────────────
-- Persists every successful brief→results pass so the user can revisit a
-- prior naming exercise, edit the brief, and re-run. Mirrors the Recent +
-- "Show all past research" affordance the main research view has.
create table if not exists domain_research_naming_runs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid null references domain_research_users(id) on delete set null,
  brief      text not null,
  filters    jsonb null,
  buy_ready  jsonb not null default '[]'::jsonb,
  stretch    jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_dr_naming_runs_user_created on domain_research_naming_runs (user_id, created_at desc);
create index if not exists idx_dr_naming_runs_created on domain_research_naming_runs (created_at desc);

-- Per-run chat thread on a saved naming run. Each user turn pairs with one
-- assistant reply; when the assistant refines filters and re-queries the
-- universe, the new {filters, buy_ready, stretch} ride along on the message
-- so reloading the run replays the latest refined view (the run record
-- itself keeps the ORIGINAL brief's snapshot, recoverable by clearing the
-- chat or starting from the brief again).
create table if not exists domain_research_naming_chat (
  id                uuid primary key default gen_random_uuid(),
  run_id            uuid not null references domain_research_naming_runs(id) on delete cascade,
  role              text not null check (role in ('user', 'assistant')),
  content           text not null default '',
  refined_filters   jsonb null,
  result_snapshot   jsonb null,
  status            text not null default 'done' check (status in ('pending', 'done', 'error')),
  created_at        timestamptz not null default now()
);
create index if not exists idx_dr_naming_chat_run on domain_research_naming_chat (run_id, created_at);

-- ── Playbook lessons (chat-driven feedback loop) ───────────────────────────
-- Refine-chat distills user corrections into reusable rules; admins approve
-- them; approved lessons get prepended to the agent's SYSTEM_PROMPT on the
-- next run. Tags are persisted for future signal-based scoping — v1 loads
-- every approved lesson regardless of tags.
create table if not exists domain_research_playbook_lessons (
  id                        uuid primary key default gen_random_uuid(),
  status                    text not null default 'pending' check (status in ('pending', 'approved', 'disabled')),
  title                     text not null,
  body                      text not null,
  tags                      text[] not null default '{}',
  source_run_id             uuid null references domain_research_runs(id) on delete set null,
  source_chat_message_id    uuid null,
  created_by                uuid null references domain_research_users(id) on delete set null,
  notes                     text null,
  applied_count             integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz
);
create index if not exists idx_dr_lessons_status on domain_research_playbook_lessons (status);
create index if not exists idx_dr_lessons_created on domain_research_playbook_lessons (created_at desc);

-- ── Owner-outreach saved templates (custom scenarios beyond the built-in 7) ──
create table if not exists domain_research_outreach_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  subject       text not null default '[DOMAIN] Domain Inquiry',
  body          text not null,                       -- reusable, with [PLACEHOLDERS]
  best_fit      text null,                           -- optional "best when…" note
  created_by    uuid null references domain_research_users(id) on delete set null,
  source_run_id uuid null references domain_research_runs(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_dr_outreach_tpl_created on domain_research_outreach_templates (created_at desc);

-- ── API-cost tracking (Reports → Cost tab) ─────────────────────────────────
-- One row per paid action; `units` in the meter's natural billing unit (1 per
-- lookup/enrichment/phone; LLM tokens in MILLIONS so the rate is "$ per 1M").
-- `category` = the activity/product the cost belongs to (domain_owner, naming,
-- outreach, …; pipeline: auctions, snap, aux, enrichment) for cost breakdowns.
create table if not exists domain_research_api_usage (
  id          bigint generated always as identity primary key,
  meter       text not null,
  units       numeric not null default 0,
  category    text null,
  run_id      uuid null references domain_research_runs(id) on delete set null,
  meta        jsonb null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_dr_usage_created on domain_research_api_usage (created_at desc);
create index if not exists idx_dr_usage_meter_created on domain_research_api_usage (meter, created_at desc);
create index if not exists idx_dr_usage_cat_created on domain_research_api_usage (category, created_at desc);

-- Admin-editable dollar rate per meter; cost = units × usd_per_unit.
create table if not exists domain_research_cost_rates (
  meter        text primary key,
  usd_per_unit numeric not null default 0,
  unit_label   text null,
  updated_at   timestamptz not null default now()
);

-- Totals per (category, meter) since a cutoff — the report pivots this into
-- "by system" / "by category" / the per-meter rate editor (rates applied live).
create or replace function cost_totals(p_since timestamptz, p_until timestamptz default null)
returns table(category text, meter text, units numeric)
language sql stable as $$
  select coalesce(category, 'uncategorized') as category, meter, sum(units) as units
  from domain_research_api_usage
  where created_at >= p_since
    and (p_until is null or created_at < p_until)
  group by 1, 2
  order by 1, 2;
$$;

-- Time series: $ per day/week/month bucket using SAVED rates (optionally one
-- category, optionally an upper time bound). Joins cost_rates so it stays tiny.
create or replace function cost_series(p_period text, p_since timestamptz, p_category text default null, p_until timestamptz default null)
returns table(bucket text, cost numeric)
language sql stable as $$
  select to_char(
           date_trunc(
             case p_period when 'month' then 'month' when 'week' then 'week' else 'day' end,
             u.created_at at time zone 'America/New_York'
           ),
           case p_period when 'month' then 'YYYY-MM' else 'YYYY-MM-DD' end
         ) as bucket,
         sum(u.units * coalesce(r.usd_per_unit, 0)) as cost
  from domain_research_api_usage u
  left join domain_research_cost_rates r on r.meter = u.meter
  where u.created_at >= p_since
    and (p_until is null or u.created_at < p_until)
    and (p_category is null or coalesce(u.category, 'uncategorized') = p_category)
  group by 1
  order by 1 desc;
$$;

-- ── Sales Research Agent (Phase 1A) ─────────────────────────────────────────
-- A "project" is one seed domain we're SELLING; candidates are companies that
-- would plausibly buy it (Upgrade now; Keyword later via the `category`/`angle`
-- columns). See SALES_RESEARCH_SPEC.md. RLS auto-enabled by the loop below.
create table if not exists domain_research_sales_projects (
  id          uuid primary key default gen_random_uuid(),
  seed_domain text not null,
  seed_sld    text not null,
  filters     jsonb,                                 -- optional industry/geo
  status      text not null default 'pending',       -- pending|running|done|failed
  stage       text,                                  -- discover|resolve|done
  error       text,
  created_by  uuid references domain_research_users(id) on delete set null,
  created_at  timestamptz not null default now(),
  angles      jsonb                                  -- Keyword phase; null in 1A
);
create index if not exists idx_sales_proj_created on domain_research_sales_projects (created_at desc);

create table if not exists domain_research_sales_candidates (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references domain_research_sales_projects(id) on delete cascade,
  domain        text,
  company       text,
  company_url   text,
  description   text,
  employee_count int,
  location      text,
  funding       text,
  category      text not null default 'upgrade',     -- 'upgrade' | 'keyword'
  subtype       text,                                -- tld_variant|affix|name_match
  angle         text,                                -- keyword only
  status        text,                                -- 'active' | 'for_sale' | 'inactive'
  tier          text,                                -- strong|medium|low|unknown (ability-to-pay)
  match_reason  text,                                -- why it surfaced (audit/UX)
  firmographics jsonb,                               -- full enrichment record
  score         numeric,                             -- rank
  alt_domains   text[],                              -- merged duplicate domains
  selected      boolean not null default false,
  enrich_status text,                                -- null|pending|done|failed
  created_at    timestamptz not null default now()
);
create index if not exists idx_sales_cand_project on domain_research_sales_candidates (project_id);
create index if not exists idx_sales_cand_status  on domain_research_sales_candidates (project_id, status);

create table if not exists domain_research_sales_contacts (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references domain_research_sales_candidates(id) on delete cascade,
  name         text,
  title        text,
  email        text,
  phone        text,
  linkedin     text,
  source       text,                                 -- rocketreach|fullenrich|...
  created_at   timestamptz not null default now()
);
create index if not exists idx_sales_contacts_cand on domain_research_sales_contacts (candidate_id);

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
