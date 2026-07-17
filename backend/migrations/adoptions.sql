create table adoptions (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals(id) on delete cascade,
  status text not null default 'available'
    check (status in ('available','pending','adopted')),
  adopter_id uuid references auth.users(id) on delete set null,
  posted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);