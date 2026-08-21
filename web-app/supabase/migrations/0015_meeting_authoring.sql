-- ===========================================================================
--  Minutes: the leadership team owns them outright
--
--  Asked for directly — a write-up should appear as soon as it is written, and
--  the people who write them should be able to correct them.
--
--  0012 argued the other way, and the argument is worth restating before it is
--  overturned: "we agreed the annual fee is now 5,000 yen" is a claim about what
--  the community has committed to, and a member reading it cannot tell a minuted
--  decision from a misremembered one. Publishing that unreviewed risks somebody
--  turning up with the wrong money.
--
--  That was written when ANY signed-in member could file one. 0013 narrowed it
--  to the leadership team, and the review step did not really survive the
--  narrowing: it now means the officers who sat in the meeting hand their own
--  minutes to the committee account to be told they are correct. The check was
--  guarding against strangers, and there are no strangers left in the queue.
--
--  So a contributor may create minutes (live at once), edit them and delete
--  them.
--
--  WHAT THE COMMITTEE KEEPS
--  ------------------------
--  `status` is in no grant below, to anybody. It has stopped being an approval
--  gate and become the one lever for taking a write-up down: the committee can
--  set it to 'rejected' and a contributor cannot put it back. Everything else
--  about a meeting is the leadership team's.
--
--  WHAT THIS GIVES UP
--  ------------------
--  DELETE, on any meeting, by any contributor, with no undo and a cascade to its
--  points. It was asked for as "can do anything by leadership team", and a group
--  that may rewrite every field can empty a record anyway — but it is worth
--  naming, because the earlier instruction for events and members was
--  add-but-not-delete and this is the one place that no longer holds.
--
--  Both the update and the delete policy are also team-wide rather than
--  own-write-ups-only: minutes are a record of a meeting several people sat in,
--  not personal content, so the officer with the clearest memory is not always
--  the one who typed it up. To narrow either one, see the marked lines below.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  Live on arrival
-- ---------------------------------------------------------------------------
/* This default is the only status an insert can produce, because `status` is
   granted to nobody — so a contributor can neither file a draft nor forge a
   state the committee has not agreed to. The check constraint still holds all
   three values; 'pending' is now only reachable by a committee member putting
   something back into review by hand. */
alter table public.meetings alter column status set default 'approved';

/* One-off, and idempotent: 'pending' meant "waiting to be approved", and nothing
   waits any more — leaving those rows hidden would strand write-ups in a queue
   that no longer has anybody serving it. 'rejected' is left exactly as it is:
   that was a decision somebody took, not a queue. */
update public.meetings
   set status = 'approved', updated_at = now()
 where status = 'pending';

-- ---------------------------------------------------------------------------
--  meetings — the leadership team's grants
-- ---------------------------------------------------------------------------
/* Column-scoped, and the list is the point. `status` is absent, as above.
   `submitted_by` is absent too, so authorship cannot be reassigned — a record of
   who wrote a decision down is worth keeping honest even inside a small team.
   `created_at` and `id` are absent for the obvious reasons. */
grant update (held_on, title, summary, place, updated_at)
  on public.meetings to authenticated;
grant delete on public.meetings to authenticated;

/* A contributor sees the ones the committee has taken down as well. Without
   this, the editing list on /decisions would be built from rows the same session
   cannot fetch, and a write-up that was pulled would simply vanish from the
   person who wrote it with no explanation. */
drop policy if exists meetings_read_contributor on public.meetings;
create policy meetings_read_contributor on public.meetings
  for select to authenticated
  using (public.can_contribute());

-- NARROW HERE: add
--   and submitted_by in (select id from public.members where user_id = auth.uid())
-- to both USING and WITH CHECK to make editing own-write-ups-only.
drop policy if exists meetings_contribute_update on public.meetings;
create policy meetings_contribute_update on public.meetings
  for update to authenticated
  using (public.can_contribute())
  with check (public.can_contribute());

-- NARROW HERE: the same clause makes deleting own-write-ups-only.
drop policy if exists meetings_contribute_delete on public.meetings;
create policy meetings_contribute_delete on public.meetings
  for delete to authenticated
  using (public.can_contribute());

-- ---------------------------------------------------------------------------
--  meeting_points
-- ---------------------------------------------------------------------------
grant update (text, position) on public.meeting_points to authenticated;
grant delete on public.meeting_points to authenticated;

/* The insert policy from 0012, narrowed by 0013, required `m.status = 'pending'`
   and the caller's own submission. Both conditions are now wrong, and the first
   one is a live bug rather than merely a stale rule: with the default flipped to
   'approved' there is no pending row for the create form's second statement to
   attach to, so it would have saved the meeting and then refused every decision
   under it — the exact half-written outcome MeetingForm has a special error
   message for. */
drop policy if exists meeting_points_submit on public.meeting_points;
create policy meeting_points_submit on public.meeting_points
  for insert to authenticated
  with check (
    public.can_contribute()
    and exists (select 1 from public.meetings m where m.id = meeting_id)
  );

/* Editing the decisions is delete-then-insert rather than a diff: the form is a
   textarea of one decision per line, and matching lines back to rows would be
   guesswork the moment somebody reorders them. So the delete policy is not an
   extra power on top of editing, it is how editing works. */
drop policy if exists meeting_points_contribute_update on public.meeting_points;
create policy meeting_points_contribute_update on public.meeting_points
  for update to authenticated
  using (public.can_contribute())
  with check (public.can_contribute());

drop policy if exists meeting_points_contribute_delete on public.meeting_points;
create policy meeting_points_contribute_delete on public.meeting_points
  for delete to authenticated
  using (public.can_contribute());

-- Matches meetings_read_contributor: a taken-down write-up is no use to edit if
-- its decisions come back empty.
drop policy if exists meeting_points_read_contributor on public.meeting_points;
create policy meeting_points_read_contributor on public.meeting_points
  for select to authenticated
  using (public.can_contribute());
