-- Add a `category` dimension to API-usage so cost can be broken down by activity
-- /product (domain_owner reports, naming, outreach, trademark, appraisal,
-- lessons; pipeline: auctions, snap, aux, enrichment). Run after 0006.

alter table domain_research_api_usage add column if not exists category text;
create index if not exists idx_dr_usage_cat_created on domain_research_api_usage (category, created_at desc);

-- Totals per (category, meter) since a cutoff — small result; the report pivots
-- this into "by system" / "by category" / the per-meter rate editor and applies
-- the (live-editable) rates client-side.
create or replace function cost_totals(p_since timestamptz)
returns table(category text, meter text, units numeric)
language sql stable as $$
  select coalesce(category, 'uncategorized') as category, meter, sum(units) as units
  from domain_research_api_usage
  where created_at >= p_since
  group by 1, 2
  order by 1, 2;
$$;

-- Time series: $ per day/week/month bucket using the SAVED rates (optionally
-- filtered to one category). Joins cost_rates so the result stays tiny.
create or replace function cost_series(p_period text, p_since timestamptz, p_category text default null)
returns table(bucket text, cost numeric)
language sql stable as $$
  select to_char(
           date_trunc(case p_period when 'month' then 'month' when 'week' then 'week' else 'day' end, u.created_at),
           case p_period when 'month' then 'YYYY-MM' else 'YYYY-MM-DD' end
         ) as bucket,
         sum(u.units * coalesce(r.usd_per_unit, 0)) as cost
  from domain_research_api_usage u
  left join domain_research_cost_rates r on r.meter = u.meter
  where u.created_at >= p_since
    and (p_category is null or coalesce(u.category, 'uncategorized') = p_category)
  group by 1
  order by 1 desc;
$$;
