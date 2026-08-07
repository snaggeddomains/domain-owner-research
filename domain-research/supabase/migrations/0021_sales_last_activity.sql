-- Sales Hub master directory — order by last-worked-on, not just created-at.
-- Re-running research on an old name (or curating its target list) should float that
-- hub to the top of "Your names · master target lists". We track a last_activity_at
-- that createSalesProject + the target-add writers bump; the directory orders by it
-- (nulls last) with created_at as the fallback/tiebreak. App degrades gracefully
-- before this runs (writes strip-and-retry the column; the list falls back to created_at).
alter table domain_research_sales_projects add column if not exists last_activity_at timestamptz;
create index if not exists idx_sales_proj_activity on domain_research_sales_projects (last_activity_at desc nulls last);

-- Backfill existing hubs so they're not all forced below freshly-touched ones on day one:
-- seed last_activity_at from the most recent signal we have per project — the newest
-- candidate added_at (real curation activity), else the project's created_at.
update domain_research_sales_projects p
set last_activity_at = coalesce(
  (select max(c.added_at) from domain_research_sales_candidates c where c.project_id = p.id),
  p.created_at
)
where p.last_activity_at is null;
