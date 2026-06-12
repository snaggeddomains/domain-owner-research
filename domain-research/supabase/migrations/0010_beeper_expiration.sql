-- Migration 0010: Beeper adaptive-cadence support. Safe to re-run.
--
-- Stores each watched domain's RDAP expiration date so the poller can taper its
-- check cadence toward it: a name months from expiry is polled occasionally
-- (weekly → daily as the date nears), a name on the cusp (delete pipeline /
-- hours out) is polled every minute. Without this column the app still works —
-- the writes silently drop it and cadence falls back to a moderate default —
-- but classification is far better once it's present.

alter table beeper_watches add column if not exists expiration timestamptz;
