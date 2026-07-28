-- Expiring .ai — Namecheap Market auction cross-reference.
--
-- A daily public CSV (Namecheap_Market_Sales.csv) lists every Namecheap Market auction
-- (~5.6k .ai names at a time). We cross-reference it against the watchlist so we can see
-- the LAST lifecycle stage — "listed on Namecheap" — with its price + auction end, and
-- track how many names reach it. NB a name can appear on Namecheap auctions BEFORE it
-- formally drops (Namecheap auctions its own expiring inventory during the grace window),
-- so `namecheap_listed_at` is a parallel signal, not strictly after `dropped_at`.
--
-- Idempotent + safe to re-run. App degrades gracefully pre-migration (upsert/update
-- strip-and-retry the new columns).

alter table domain_research_expiring_ai add column if not exists namecheap_listed_at timestamptz;  -- first time we saw it on NC auctions
alter table domain_research_expiring_ai add column if not exists namecheap_price      numeric;      -- current auction price (USD)
alter table domain_research_expiring_ai add column if not exists namecheap_end        timestamptz;  -- auction end time
alter table domain_research_expiring_ai add column if not exists namecheap_url        text;         -- link to the Namecheap Market listing

create index if not exists idx_expiring_ai_namecheap
  on domain_research_expiring_ai (namecheap_listed_at desc nulls last)
  where namecheap_listed_at is not null;
