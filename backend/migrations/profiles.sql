create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'citizen'
    check (role in ('citizen', 'volunteer', 'ngo_admin', 'superadmin')),
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);