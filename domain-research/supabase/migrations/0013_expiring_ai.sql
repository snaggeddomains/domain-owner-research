-- Expiring .ai — curated watchlist of good one-word dictionary .ai names, scanned
-- adaptively for the redemption-period drop window. Run on the research project.
-- (RLS is auto-enabled for domain_research_% tables by the loop in schema.sql.)

create table if not exists domain_research_expiring_ai (
  domain           text primary key,          -- e.g. descale.ai
  sld              text not null,              -- descale
  tld_count        int,                        -- # of popular TLDs the word is registered in (demand/quality gate)
  nameservers      text[] not null default '{}', -- captured at scan (parked detection / display)
  parked           boolean not null default false, -- NS look like a parking/marketplace host (likely investor)
  expiration       timestamptz,               -- registry expiration (learned from RDAP; drives cadence)
  last_status      text[] not null default '{}', -- newest EPP statuses (lowercased)
  in_redemption    boolean not null default false, -- currently in redemption / delete pipeline (the money signal)
  redemption_since timestamptz,               -- first time we saw it enter the pipeline
  available        boolean not null default false, -- RDAP now not-found (dropped)
  last_http        int,                        -- last RDAP status code
  last_checked     timestamptz,               -- last RDAP scan
  emailed_at       timestamptz,               -- when this name was sent in the digest email (null = not yet sent)
  dismissed        boolean not null default false, -- hidden from the report
  created_at       timestamptz not null default now()
);

-- Scan picks the stalest candidates first (never-checked → nulls first).
create index if not exists idx_expiring_ai_checked on domain_research_expiring_ai (last_checked asc nulls first);
-- The report reads the currently-in-redemption set.
create index if not exists idx_expiring_ai_redemption on domain_research_expiring_ai (in_redemption, redemption_since desc) where in_redemption;
-- The digest cron pulls newly-in-redemption names not yet emailed.
create index if not exists idx_expiring_ai_unemailed on domain_research_expiring_ai (redemption_since desc) where in_redemption and emailed_at is null;
-- Cadence tapering leans on the expiration.
create index if not exists idx_expiring_ai_expiration on domain_research_expiring_ai (expiration asc nulls last);

-- Tiny KV for the curation keyset cursor (the last .ai domain we curated up to).
create table if not exists domain_research_expiring_ai_meta (
  k text primary key,
  v text,
  updated_at timestamptz not null default now()
);

-- Enable RLS (service key bypasses; no public access). schema.sql's domain_research_%
-- loop also does this, but run it here so it's covered immediately.
alter table domain_research_expiring_ai enable row level security;
alter table domain_research_expiring_ai_meta enable row level security;
