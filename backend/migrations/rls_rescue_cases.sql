-- 1. Lock the table
alter table rescue_cases enable row level security;

-- 2. A citizen can view only the cases THEY reported
create policy "Citizens can view their own reports"
on rescue_cases for select
using (reporter_id = auth.uid());

-- 3. Volunteers, coordinators, and superadmins can view ALL cases
create policy "Responders can view all cases"
on rescue_cases for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('volunteer', 'ngo_admin', 'superadmin')
  )
);

-- 4. Any logged-in user can report a new case, but only as themselves
create policy "Logged-in users can report a case"
on rescue_cases for insert
with check (auth.uid() = reporter_id);

-- 5. Only volunteers, coordinators, and superadmins can update a case's status
create policy "Responders can update cases"
on rescue_cases for update
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('volunteer', 'ngo_admin', 'superadmin')
  )
);