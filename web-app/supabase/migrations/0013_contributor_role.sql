-- ===========================================================================
--  Three tiers, not two
--
--  Until now there were two: `is_admin`, who could do everything, and everybody
--  else, who could edit their own card and submit a story. The leadership team
--  had no more power than a general member — so the only way to let an officer
--  put an event up was to make them a full admin, which also let them delete
--  members and approve their own submissions.
--
--      general member   own card · submit a story
--      leadership       own card · submit a story · submit a meeting · add an event
--      committee        all of that, plus edit, delete, publish and approve
--
--  A SEPARATE COLUMN, not `category = 'leadership'`
--  ------------------------------------------------
--  Deriving this from category would have been less to maintain and it is what
--  the committee already means by "the leadership team". It is not done that way
--  because category decides which list you appear in on the homepage — it is a
--  presentation choice. Tie authority to it and moving somebody between lists to
--  fix the layout silently grants or removes their ability to publish events.
--  Those two decisions want to be made separately, so they are separate columns.
--
--  It is seeded from category once, below, so nothing has to be set by hand
--  today; after that the toggle on /admin/members owns it.
--
--  WHY AN ADDED EVENT IS NOT LIVE YET
--  ----------------------------------
--  "Add, but not modify" leaves no way to fix a typo — and a wrong date for
--  Dashain on the public homepage is the kind of mistake that has people turning
--  up on the wrong Sunday. So an event added by a leadership member arrives
--  unpublished and a committee member publishes it, which is the same shape as
--  stories and meetings: members write, the committee confirms. One rule for all
--  three, rather than three different answers to remember.
-- ===========================================================================

alter table public.members
  add column if not exists can_contribute boolean not null default false;

comment on column public.members.can_contribute is
  'May add events and meeting write-ups, for the committee to publish. Not the '
  'same as is_admin, which may also edit, delete and approve. Deliberately NOT '
  'derived from category — see 0013.';

-- One-off seed: the leadership team as it stands today. Guarded so re-running
-- the file does not undo a decision somebody has since made on the Committee
-- page — without this, a member whose access was deliberately withdrawn would
-- get it back the next time setup.sql was pasted in.
do $$
begin
  if not exists (select 1 from public.members where can_contribute) then
    update public.members set can_contribute = true where category = 'leadership';
  end if;
end $$;

/* is_admin() implies this. Callers should never have to ask two questions to
   find out whether somebody may add something, and forgetting the second is
   exactly how an admin ends up unable to use a form they are meant to own. */
create or replace function public.can_contribute()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select m.can_contribute or m.is_admin from public.members m
      where m.user_id = auth.uid()), false)
$$;

revoke all on function public.can_contribute() from anon;
grant execute on function public.can_contribute() to authenticated;

-- ---------------------------------------------------------------------------
--  Events: leadership may add, and add nothing else
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists submitted_by uuid references public.members(id) on delete set null;

comment on column public.events.submitted_by is
  'Who added it. Null for events the committee entered directly.';

/* Note what is NOT here: no update policy and no delete policy for a
   contributor. The `events_admin` policy from 0004 is `for all ... using
   (is_admin())`, so UPDATE and DELETE remain the committee's alone even though
   the table-level grant covers every column — the policy is what refuses, and
   this only adds a second, narrower way IN.
   
   `not is_published` is the load-bearing half of the check. Without it a
   contributor could add an event straight to the public homepage and then have
   no way to correct it. */
drop policy if exists events_contribute on public.events;
create policy events_contribute on public.events
  for insert to authenticated
  with check (
    public.can_contribute()
    and not is_published
    and submitted_by in (select id from public.members where user_id = auth.uid())
  );

-- A contributor can also see their own draft back, or it vanishes on submission.
drop policy if exists events_read_own on public.events;
create policy events_read_own on public.events
  for select to authenticated
  using (submitted_by in (select id from public.members where user_id = auth.uid()));

/* Highlights follow their event, and only while it is still an unpublished
   draft of theirs. Without the `not is_published` condition a contributor could
   keep appending bullet points to an event the committee had already published,
   which would make publishing it mean nothing. */
drop policy if exists event_highlights_contribute on public.event_highlights;
create policy event_highlights_contribute on public.event_highlights
  for insert to authenticated
  with check (exists (
    select 1 from public.events e
     where e.id = event_id
       and not e.is_published
       and e.submitted_by in (select id from public.members where user_id = auth.uid())));

drop policy if exists event_highlights_read_own on public.event_highlights;
create policy event_highlights_read_own on public.event_highlights
  for select to authenticated
  using (exists (
    select 1 from public.events e
     where e.id = event_id
       and e.submitted_by in (select id from public.members where user_id = auth.uid())));

-- ---------------------------------------------------------------------------
--  Meetings: narrowed from every member to the leadership team
--
--  This was open to any signed-in member. Minutes are a record of what the
--  community committed to, and who is entitled to write that down is a smaller
--  group than who is entitled to tell their own story.
-- ---------------------------------------------------------------------------
drop policy if exists meetings_submit on public.meetings;
create policy meetings_submit on public.meetings
  for insert to authenticated
  with check (
    public.can_contribute()
    and submitted_by in (select id from public.members where user_id = auth.uid())
  );

drop policy if exists meeting_points_submit on public.meeting_points;
create policy meeting_points_submit on public.meeting_points
  for insert to authenticated
  with check (exists (
    select 1 from public.meetings m
     where m.id = meeting_id
       and m.status = 'pending'
       and public.can_contribute()
       and m.submitted_by in (select id from public.members where user_id = auth.uid())));

-- ---------------------------------------------------------------------------
--  Stories stay open to every member. Somebody's account of their own life is
--  not a claim about the community, and the committee still approves it.
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_contributor(p_member_id uuid, p_can boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  update public.members set can_contribute = p_can where id = p_member_id;
end $$;

revoke all on function public.admin_set_contributor(uuid, boolean) from anon;
grant execute on function public.admin_set_contributor(uuid, boolean) to authenticated;

/* Re-asserted from 0010 so the full list of columns a member may write is
   visible next to the column that must never be in it. can_contribute and
   is_admin are both absent, which is what stops anybody promoting themselves. */
revoke update on public.members from authenticated;
grant update (profession, photo_path, facebook_url, instagram_url, tiktok_url,
              updated_at)
  on public.members to authenticated;
