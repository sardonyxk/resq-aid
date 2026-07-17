alter table ngos enable row level security;

create policy "Anyone can view NGOs"
on ngos for select
using (true);

create policy "Superadmins can insert NGOs"
on ngos for insert
with check (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'superadmin')
);

create policy "NGO admins and superadmins can update their NGO"
on ngos for update
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'superadmin'
  )
  or
  exists (
    select 1 from volunteer_profiles
    where volunteer_profiles.user_id = auth.uid()
    and volunteer_profiles.ngo_id = ngos.id
  )
);