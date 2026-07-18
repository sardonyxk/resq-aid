# Checkpoint 3 — ResQ-Aid Backend

_Builds on Checkpoint 2._

## Work done since Checkpoint 2

### 1. `volunteer_profiles` inserts
- Changed profile inserts to use upsert logic:
  ```sql
  INSERT INTO volunteer_profiles (user_id, ...)
  VALUES ('<user_id>', ...)
  ON CONFLICT (user_id) DO UPDATE SET ...;
  ```
- Still to check: whether both the auto-profile-creation trigger (from Checkpoint 2) and app-level code are inserting on signup.

### 2. Case ordering and assignment
- Defined an ordering for the case list — urgency first, then most recently reported:
  ```sql
  ORDER BY urgency_score DESC NULLS LAST, created_at DESC, id
  ```
- Built a `claim_next_case(p_team_id uuid)` function using `FOR UPDATE SKIP LOCKED`, so concurrent dashboard sessions each get a distinct case rather than being able to claim the same one.
- Added a supporting index:
  ```sql
  create index idx_rescue_cases_priority
  on rescue_cases (status, urgency_score desc, created_at desc);
  ```
- This is the first assignment logic built on top of Checkpoint 2's `nearest_available_team()` — the "who gets the case next" layer, on top of "which team is closest."
- Not yet done: reported-case aging (time-since-reported affecting priority) — discussed, not implemented.
- Not yet done: confirming every dashboard read path (main list, filtered views, claim function) uses this same ordering.

### 3. RLS policies on `volunteer_profiles`
- Did a first close read of the policies from Checkpoint 2.
- Noted the SELECT policy grants any `volunteer`/`ngo_admin`/`superadmin` visibility into **all** volunteer profiles (checks requester's role, not row ownership) — decision on whether that's intended is still open.
- INSERT/UPDATE policies (own-row only) reviewed, no changes made.
- Not yet done: same review pass on `rescue_cases` RLS policies, particularly UPDATE.

### 4. `login.html` — backend connection
- Traced the "can't connect to localhost" issue to the backend: `/api/auth/login` and `/api/auth/signup` weren't confirmed running in Checkpoint 2 (only `/health` and `/api/dispatch/nearest-team` were).
- Not yet done: confirm the backend process is running and that the auth routes are built and mounted in `src/app.js`.


  

