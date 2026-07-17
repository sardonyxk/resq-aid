-- Add report_count to support duplicate-report aggregation
alter table rescue_cases
  add column report_count int not null default 1;

-- Function: find active cases within a radius (for dedup/escalation check)
create or replace function nearby_active_cases(
  lat double precision,
  lng double precision,
  radius_meters double precision default 50
)
returns table (
  id uuid,
  description text,
  urgency_score int,
  status text,
  report_count int,
  created_at timestamptz,
  distance_meters double precision
)
language sql
stable
as $$
  select
    rc.id,
    rc.description,
    rc.urgency_score,
    rc.status,
    coalesce(rc.report_count, 1) as report_count,
    rc.created_at,
    ST_Distance(rc.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) as distance_meters
  from rescue_cases rc
  where rc.status not in ('closed', 'cancelled')
    and ST_DWithin(
      rc.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  order by distance_meters asc;
$$;