create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'system'
    check (type in ('case_update','dispatch','adoption','system')),
  related_case_id uuid references rescue_cases(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);