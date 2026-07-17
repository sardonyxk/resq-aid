create table rescue_updates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references rescue_cases(id) on delete cascade,
  status text not null,
  note text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);