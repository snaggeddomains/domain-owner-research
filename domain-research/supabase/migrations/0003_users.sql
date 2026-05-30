-- Migration 0003: users table + run ownership
-- Multi-user auth (replaces the single APP_PASSWORD gate). Safe to re-run.

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

alter table public.domain_research_users enable row level security;

-- Link runs back to the user that triggered them, so notifications + per-user
-- listings work. Existing rows have user_id = null (legacy, no associated user).
alter table domain_research_runs
  add column if not exists user_id uuid references domain_research_users(id) on delete set null;
create index if not exists idx_dr_runs_user on domain_research_runs (user_id);
