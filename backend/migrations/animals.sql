create table animals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references rescue_cases(id) on delete set null,
  name text,
  animal_type text not null check (animal_type in ('dog','cat','cow','bird','other')),
  description text,
  photo_url text,
  created_at timestamptz not null default now()
);