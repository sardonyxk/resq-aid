create table ngos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  contact_email text,
  contact_phone text,
  address text,
  location geography(Point, 4326),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);