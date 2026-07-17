alter table rescue_teams enable row level security;

create policy "Responders can view rescue teams"
on rescue_teams for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('volunteer', 'ngo_admin', 'superadmin')
  )
);

create policy "Coordinators can manage rescue teams"
on rescue_teams for insert
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('ngo_admin', 'superadmin')
  )
);

create policy "Coordinators can update rescue teams"
on rescue_teams for update
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('ngo_admin', 'superadmin')
  )
);