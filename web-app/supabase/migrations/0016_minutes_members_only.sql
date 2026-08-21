-- ===========================================================================
--  Minutes come off the public web
--
--  Asked for directly: a write-up should be readable only after signing in, by
--  any member — general or leadership — while writing and correcting them stays
--  with the leadership team, as 0015 left it.
--
--  This is the third position this section has held, so it is worth writing down
--  what each one was for. 0012 held them back until the committee approved them,
--  because anybody could file one. 0015 published them on arrival, because by
--  then only the leadership team could. This is a different axis: not who may
--  write, but who may read. "The annual fee is now 5,000 yen and Dashain is on
--  the 18th" is the community talking to itself about its own money and its own
--  arrangements, and there is no reason for it to be on the open web where it is
--  indexed, quoted out of date, and readable by anyone who finds the URL.
--
--  TWO BARRIERS, NOT ONE
--  ---------------------
--  The SELECT grant is revoked from `anon` and the read policy additionally
--  requires is_member(). Either alone would do the job today; both are here
--  because they fail differently. Without the grant a visitor's request is
--  refused by Postgres before any policy runs, which is the barrier that cannot
--  be got round by a policy edit. With the policy, a future migration that
--  re-grants SELECT to anon out of habit still does not leak anything.
--
--  A SIGNED-IN ACCOUNT IS NOT ENOUGH
--  ---------------------------------
--  is_member() asks for a row in `members` pointed at the caller, not merely for
--  a session. Anybody can create an account; being on the register is a separate
--  thing that the committee or a claim code confers. The wording asked for was
--  "leadership or general both user", which is exactly the register.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  meetings
-- ---------------------------------------------------------------------------
revoke select on public.meetings from anon;

/* Was: `for select using (status = 'approved' or public.is_admin())`, with no
   role restriction, which meant anon as well. `to authenticated` and is_member()
   are the two halves of the change.

   The other two SELECT policies on this table need no edit: meetings_read_own
   is keyed to the caller's own member rows and meetings_read_contributor calls
   can_contribute(), so both already imply a member card. Permissive policies are
   OR-ed, so leaving a wider one in place here would have undone the whole
   migration — worth checking rather than assuming. */
drop policy if exists meetings_read on public.meetings;
create policy meetings_read on public.meetings
  for select to authenticated
  using (public.is_member() and (status = 'approved' or public.is_admin()));

-- ---------------------------------------------------------------------------
--  meeting_points
-- ---------------------------------------------------------------------------
revoke select on public.meeting_points from anon;

drop policy if exists meeting_points_read on public.meeting_points;
create policy meeting_points_read on public.meeting_points
  for select to authenticated
  using (public.is_member() and exists (
    select 1 from public.meetings m
     where m.id = meeting_id and (m.status = 'approved' or public.is_admin())));
