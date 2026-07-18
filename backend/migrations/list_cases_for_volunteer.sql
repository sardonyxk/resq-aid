create or replace function list_cases_for_volunteer(p_user_id uuid)
returns table (
  id uuid,
  animal_type text,
  description text,
  urgency_score int,
  status text,
  landmark text,
  lat double precision,
  lng double precision,
  created_at timestamptz
)
language sql
stable
as $$
  select
    rc.id, rc.animal_type, rc.description, rc.urgency_score, rc.status, rc.landmark,
    ST_Y(rc.location::geometry) as lat,
    ST_X(rc.location::geometry) as lng,
    rc.created_at
  from rescue_cases rc
  join rescue_teams rt on rt.id = rc.assigned_team_id
  join volunteer_profiles vp on vp.id = rt.volunteer_id
  where vp.user_id = p_user_id
  order by rc.created_at desc;
$$;