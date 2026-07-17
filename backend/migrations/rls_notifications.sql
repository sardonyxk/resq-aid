-- 1. Lock the table
alter table notifications enable row level security;

-- 2. Users can view only their own notifications
create policy "Users can view their own notifications"
on notifications for select
using (user_id = auth.uid());

-- 3. Users can update (mark read) only their own notifications
create policy "Users can update their own notifications"
on notifications for update
using (user_id = auth.uid());

-- Note: no INSERT policy here on purpose — regular users cannot create
-- notifications through the API. Only the backend, using the service_role
-- key (which bypasses RLS entirely), will insert notification rows.