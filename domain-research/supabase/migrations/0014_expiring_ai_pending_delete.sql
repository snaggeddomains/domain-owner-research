-- Expiring .ai — pending-delete window + lifecycle-duration tracking.
--
-- Adds the pending-delete phase (names that moved OUT of redemption into the final
-- ~4–6-day countdown to the drop) plus the timestamps the Metrics tab aggregates:
-- how long a name sits in redemption before pending delete, and in pending delete
-- before it drops. `demand_ok` remembers the one-time quality-gate decision so it
-- carries across the redemption→pending-delete transition without re-probing.
--
-- Idempotent + safe to re-run. The app degrades gracefully before this runs
-- (updateCandidate / staleCandidates strip-and-retry the new columns).

alter table domain_research_expiring_ai add column if not exists in_pending_delete boolean default false;
alter table domain_research_expiring_ai add column if not exists pending_delete_since timestamptz;
alter table domain_research_expiring_ai add column if not exists dropped_at timestamptz;
alter table domain_research_expiring_ai add column if not exists demand_ok boolean;

-- Partial index for the pending-delete list (mirrors the in_redemption access pattern).
create index if not exists idx_expiring_ai_pending
  on domain_research_expiring_ai (pending_delete_since desc nulls last)
  where in_pending_delete = true;

-- Backfill demand_ok for the existing surfaced rows so they stay visible without a
-- re-probe: anything currently in redemption passed the gate.
update domain_research_expiring_ai set demand_ok = true where in_redemption = true and demand_ok is null;
