-- SNAP Research — a dictionary-walk that builds, over time, a per-word report of
-- ABANDONMENT + VALUE clues for the <word>.com, to surface valuable one-word .coms whose
-- owner has likely let them go (acquisition candidates for SNAP Deals). Run once on the
-- RESEARCH project. Needs english_words.zipf (naming project) for most-common-first ordering.
--
-- Two axes: VALUE (tld_count demand + word commonness (zipf) + brevity) and ABANDONMENT
-- (parked/dead .com, live-but-stale footer year, unchanged-for-years via Wayback). A
-- candidate = high value AND high abandonment.

create table if not exists domain_research_snap_research (
  domain          text primary key,          -- <word>.com
  word            text not null,
  zipf            real,                       -- word frequency (from english_words.zipf) — ordering
  wlen            int,                        -- word length (brevity → value)
  tld_count       int,                        -- popular-TLD count (demand → value); only probed once abandoned-looking
  site_status     text,                       -- active | parked | for_sale | no_resolve | unknown
  site_title      text,
  stale           boolean default false,      -- live site but an OLD copyright/footer year
  stale_year      int,                        -- detected copyright year
  wayback_first   date,
  wayback_last    date,
  wayback_count   int,
  unchanged_years real,                       -- Wayback span (proxy for "held & untouched for years")
  nameservers     text[],
  value_score     int,                        -- 0..100
  abandon_score   int,                        -- 0..100
  score           int,                        -- surfacing score = value × abandon / 100
  candidate       boolean default false,      -- passed the value+abandon thresholds
  checked_stage   text,                       -- 'abandon' (cheap pass) | 'full' (incl. tld_count)
  last_checked    timestamptz,
  dismissed       boolean default false,
  added_deal      boolean default false,      -- one-click added to SNAP Deals (phase 3)
  created_at      timestamptz default now()
);
-- Scan order: never-checked first, and among those the most-common words (highest zipf) first.
create index if not exists idx_snap_research_scan on domain_research_snap_research (last_checked asc nulls first, zipf desc nulls last);
-- Candidate surfacing: best score first.
create index if not exists idx_snap_research_candidate on domain_research_snap_research (score desc) where candidate = true and dismissed = false;

create table if not exists domain_research_snap_research_meta (
  k          text primary key,
  v          text,
  updated_at timestamptz default now()
);

alter table domain_research_snap_research enable row level security;
alter table domain_research_snap_research_meta enable row level security;
