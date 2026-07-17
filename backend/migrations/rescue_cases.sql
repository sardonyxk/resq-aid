create table rescue_cases (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  reporter_contact text,
  animal_type text not null check (animal_type in ('dog','cat','cow','bird','other')),
  description text,
  image_url text,
  urgency_score int check (urgency_score between 1 and 5),
  status text not null default 'reported'
    check (status in ('reported','triaged','dispatched','in_progress','rescued','closed','cancelled')),
  location geography(Point, 4326) not null,
  landmark text,
  assigned_team_id uuid references rescue_teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);