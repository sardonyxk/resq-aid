alter table adoptions enable row level security;

create policy "Anyone can view adoption listings"
on adoptions for select
using (true);

create policy "Responders can create adoption listings"
on adoptions for insert
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('volunteer', 'ngo_admin', 'superadmin')
  )
);

create policy "Logged-in users can express interest in an available listing"
on adoptions for update
using (status = 'available')
with check (adopter_id = auth.uid());

create policy "Responders can update any adoption listing"
on adoptions for update
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('volunteer', 'ngo_admin', 'superadmin')
  )
);