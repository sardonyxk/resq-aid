alter table volunteer_profiles enable row level security;

create policy "Responders can view volunteer profiles"
on volunteer_profiles for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('volunteer', 'ngo_admin', 'superadmin')
  )
);

create policy "Volunteers can update their own profile"
on volunteer_profiles for update
using (user_id = auth.uid());

create policy "Volunteers can insert their own profile"
on volunteer_profiles for insert
with check (user_id = auth.uid());