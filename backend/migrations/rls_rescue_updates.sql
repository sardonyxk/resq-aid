alter table rescue_updates enable row level security;

create policy "Reporters can view updates on their case"
on rescue_updates for select
using (
  exists (
    select 1 from rescue_cases
    where rescue_cases.id = rescue_updates.case_id
    and rescue_cases.reporter_id = auth.uid()
  )
);

create policy "Responders can view all updates"
on rescue_updates for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('volunteer', 'ngo_admin', 'superadmin')
  )
);

create policy "Responders can create updates"
on rescue_updates for insert
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('volunteer', 'ngo_admin', 'superadmin')
  )
);