-- Bucket the cost time series by EASTERN TIME (America/New_York, auto EDT/EST)
-- instead of UTC, so "yesterday" and the daily/weekly/monthly rows line up with
-- the day as Rob experiences it. Same signature as 0008 → plain create-or-replace.
-- (The [since, until) range bounds are absolute instants computed ET-correctly in
--  the API, so cost_totals needs no change.)
create or replace function cost_series(p_period text, p_since timestamptz, p_category text default null, p_until timestamptz default null)
returns table(bucket text, cost numeric)
language sql stable as $$
  select to_char(
           date_trunc(
             case p_period when 'month' then 'month' when 'week' then 'week' else 'day' end,
             u.created_at at time zone 'America/New_York'
           ),
           case p_period when 'month' then 'YYYY-MM' else 'YYYY-MM-DD' end
         ) as bucket,
         sum(u.units * coalesce(r.usd_per_unit, 0)) as cost
  from domain_research_api_usage u
  left join domain_research_cost_rates r on r.meter = u.meter
  where u.created_at >= p_since
    and (p_until is null or u.created_at < p_until)
    and (p_category is null or coalesce(u.category, 'uncategorized') = p_category)
  group by 1
  order by 1 desc;
$$;
