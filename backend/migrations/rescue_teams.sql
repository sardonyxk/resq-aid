create table rescue_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  is_available boolean not null default true,
  location geography(Point, 4326) not null,
  created_at timestamptz not null default now()
);