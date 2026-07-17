create or replace function nearest_available_team(
  lat double precision,
  lng double precision,
  radius_meters int default 10000
)
returns table (
  team_id uuid,
  team_name text,
  distance_meters double precision
)
language sql
stable
as $$
  select
    id as team_id,
    name as team_name,
    st_distance(location, st_setsrid(st_makepoint(lng, lat), 4326)::geography) as distance_meters
  from rescue_teams
  where is_available = true
    and st_dwithin(location, st_setsrid(st_makepoint(lng, lat), 4326)::geography, radius_meters)
  order by distance_meters asc
  limit 5;
$$;