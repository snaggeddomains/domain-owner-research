-- Sales Hub — per-name persistent target list (see SALES_HUB_SPEC.md).
-- Turns a Sales Research candidate row into a first-class, curated TARGET:
--   is_target       — promoted onto the name's target list (durable, vs the
--                     transient `selected` checkbox state)
--   manual          — a company added by hand (contact info optional), not
--                     surfaced by discovery
--   shortlist_rank  — 1..5, a human "this is a TOP FIT for this name" mark
--                     (null = not a top fit). Independent of contact status.
--   notes           — free-text comments per company (edited inline)
--   added_at        — when promoted onto the target list
--   shortlisted_at  — when first marked a ⭐ top fit
-- Additive + idempotent. The db helpers strip-and-retry on 42703 so the module
-- keeps working before this runs; the target-list features light up once it's
-- applied on the research project.

alter table domain_research_sales_candidates
  add column if not exists is_target       boolean not null default false,
  add column if not exists manual          boolean not null default false,
  add column if not exists shortlist_rank  smallint,
  add column if not exists notes           text,
  add column if not exists added_at        timestamptz,
  add column if not exists shortlisted_at  timestamptz;

create index if not exists idx_sales_cand_target
  on domain_research_sales_candidates (project_id, is_target);

create index if not exists idx_sales_cand_shortlist
  on domain_research_sales_candidates (project_id, shortlist_rank)
  where shortlist_rank is not null;
