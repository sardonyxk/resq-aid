-- 1. Lock the table
alter table profiles enable row level security;

-- 2. Let a user read their own profile
create policy "Users can view their own profile"
on profiles for select
using (auth.uid() = id);

-- 3. Let a user update their own profile
create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = id);