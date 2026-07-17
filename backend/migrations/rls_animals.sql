alter table animals enable row level security;

create policy "Anyone can view animals"
on animals for select
using (true);

create policy "Responders can create animal records"
on animals for insert
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('volunteer', 'ngo_admin', 'superadmin')
  )
);

create policy "Responders can update animal records"
on animals for update
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('volunteer', 'ngo_admin', 'superadmin')
  )
);