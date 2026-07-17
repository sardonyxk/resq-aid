drop function nearby_active_cases(double precision, double precision, double precision);

create function nearby_active_cases(
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
  assigned_team_id uuid,
  reporter_id uuid,
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
    rc.assigned_team_id,
    rc.reporter_id,
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