-- API-cost tracking — powers the snagged-admin "Reports → Cost" tab.
-- Run once on the MAIN research project (the same project snagged-admin reads
-- for import history + notifications).

-- One row per paid action. `meter` is a free-form key (auto-discovered by the
-- report UI); `units` is in the meter's NATURAL billing unit so rates read
-- cleanly: 1 per lookup/enrichment/phone, and LLM tokens in MILLIONS of tokens
-- (so the rate is "$ per 1M tokens"). cost = units × rate.
create table if not exists domain_research_api_usage (
  id          bigint generated always as identity primary key,
  meter       text not null,
  units       numeric not null default 0,
  run_id      uuid null references domain_research_runs(id) on delete set null,
  meta        jsonb null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_dr_usage_created on domain_research_api_usage (created_at desc);
create index if not exists idx_dr_usage_meter_created on domain_research_api_usage (meter, created_at desc);

-- Admin-editable dollar rate per meter (set in the Reports tab). cost = units × usd_per_unit.
create table if not exists domain_research_cost_rates (
  meter        text primary key,
  usd_per_unit numeric not null default 0,
  unit_label   text null,
  updated_at   timestamptz not null default now()
);

-- RLS on (no policies → service-key/backend access only; matches every other
-- domain_research_% table).
alter table public.domain_research_api_usage enable row level security;
alter table public.domain_research_cost_rates enable row level security;
