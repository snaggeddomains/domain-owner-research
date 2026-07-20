-- Drop Campaign columns on beeper_watches (run on the research project).
-- Beeper writes degrade gracefully (strip + retry) until this migration runs.
alter table beeper_watches add column if not exists drop_campaign boolean;  -- this watch also polls registrar/marketplace availability
alter table beeper_watches add column if not exists auto_register boolean;   -- auto-register via NameSilo the instant it's registerable
alter table beeper_watches add column if not exists campaign jsonb;          -- last per-platform campaign state (for next-tick diff)
