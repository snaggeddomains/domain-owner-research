-- Sales Hub — dismiss/hide a candidate that isn't a fit (see SALES_HUB_SPEC.md).
-- A NOT-A-FIT triage flag: as Judy/Brian work down the Explore + Beast Mode lists
-- they either ADD a name to the target list or DISMISS it (e.g. askdelegate.com is
-- garbage — dismiss so it stops re-appearing). A dismissed row is hidden by default
-- and can be viewed ("Show dismissed") + restored later.
--   dismissed     — hidden from Explore/Beast Mode by default
--   dismissed_at  — when it was dismissed
-- Additive + idempotent. The db helpers strip-and-retry on 42703 so the module keeps
-- working before this runs; dismiss lights up once it's applied on the research project.

alter table domain_research_sales_candidates
  add column if not exists dismissed     boolean not null default false,
  add column if not exists dismissed_at  timestamptz;

create index if not exists idx_sales_cand_dismissed
  on domain_research_sales_candidates (project_id, dismissed);

-- qualify_status — records that an Apollo firmographics QUALIFY was ATTEMPTED, so a
-- "searched, nothing found" result reads differently from "never qualified":
--   'done'  — firmographics found       'empty' — searched, no coverage
-- (null = never attempted). Lets the UI stop showing the same "tick + Qualify" prompt
-- after a real attempt came back empty. Strip-and-retry so writes degrade pre-migration.
alter table domain_research_sales_candidates
  add column if not exists qualify_status text;

-- Beast Mode (the TLD/affix sweep) is expensive (a full live crawl), so its results are
-- SAVED per name and loaded instantly; a Refresh button re-sweeps. Stored on the project.
alter table domain_research_sales_projects
  add column if not exists ext_results  jsonb,
  add column if not exists ext_swept_at timestamptz;
