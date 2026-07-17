create table volunteer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  ngo_id uuid references ngos(id) on delete set null,
  full_name text not null,
  phone text,
  is_available boolean not null default true,
  location geography(Point, 4326),
  created_at timestamptz not null default now()
);