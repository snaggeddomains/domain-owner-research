-- Add an optional upper time bound (p_until) to the cost RPCs so the Reports tab
-- can show a CUSTOM date range (e.g. just yesterday), not only "last N days".
-- Safe to run whether or not 0007 was already applied: drops the old signatures
-- first, then recreates with the extra (defaulted) parameter.

drop function if exists cost_totals(timestamptz);
drop function if exists cost_series(text, timestamptz, text);

create or replace function cost_totals(p_since timestamptz, p_until timestamptz default null)
returns table(category text, meter text, units numeric)
language sql stable as $$
  select coalesce(category, 'uncategorized') as category, meter, sum(units) as units
  from domain_research_api_usage
  where created_at >= p_since
    and (p_until is null or created_at < p_until)
  group by 1, 2
  order by 1, 2;
$$;

create or replace function cost_series(p_period text, p_since timestamptz, p_category text default null, p_until timestamptz default null)
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
    and (p_until is null or u.created_at < p_until)
    and (p_category is null or coalesce(u.category, 'uncategorized') = p_category)
  group by 1
  order by 1 desc;
$$;
