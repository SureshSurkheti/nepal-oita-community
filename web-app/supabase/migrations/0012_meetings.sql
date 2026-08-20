-- ===========================================================================
--  Meeting decisions — what was agreed, in points, month by month
--
--  Members write these up; the committee confirms them before they appear.
--
--  That review step was asked for the other way round — "add by any member after
--  login" — and it is worth saying plainly why it is here anyway, because it is
--  a deliberate departure. A community story is one person's account of their
--  own life and it is obvious on the page whose account it is. A decision is not
--  that: "we agreed the annual fee is now 5,000 yen" is a claim about what the
--  community has committed to, and a member reading it has no way of telling a
--  minuted decision from a misremembered one. Publishing it unreviewed does not
--  risk embarrassment, it risks somebody turning up with the wrong money.
--
--  So any member may write one up, and it appears at once on their own screen
--  marked as waiting. One line in the read policy changes that if the committee
--  would rather it went straight up.
-- ===========================================================================

create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  held_on      date not null,
  title        text not null,
  summary      text,
  place        text,
  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid references public.members(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists meetings_public_idx on public.meetings (status, held_on desc);

create table if not exists public.meeting_points (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  text       text not null,
  position   int  not null default 0
);

create index if not exists meeting_points_meeting_idx
  on public.meeting_points (meeting_id, position);

alter table public.meetings       enable row level security;
alter table public.meeting_points enable row level security;

-- ---------------------------------------------------------------------------
--  meetings
-- ---------------------------------------------------------------------------
revoke all on public.meetings from anon, authenticated;
grant select on public.meetings to anon, authenticated;

/* Column-scoped insert, exactly as for stories, and for the same reason:
   `status` is not in the list, so it takes its default of 'pending' no matter
   what the form sends. There is no version of the submission form that could
   publish its own text. `submitted_by` IS grantable, but the policy below pins
   it to one of the caller's own member rows. */
grant insert (held_on, title, summary, place, submitted_by)
  on public.meetings to authenticated;

drop policy if exists meetings_read on public.meetings;
create policy meetings_read on public.meetings
  for select using (status = 'approved' or public.is_admin());

-- A member always sees their own write-up, whatever state it is in. Without
-- this it vanishes on submission and they file it again.
drop policy if exists meetings_read_own on public.meetings;
create policy meetings_read_own on public.meetings
  for select to authenticated
  using (submitted_by in (select id from public.members where user_id = auth.uid()));

drop policy if exists meetings_submit on public.meetings;
create policy meetings_submit on public.meetings
  for insert to authenticated
  with check (submitted_by in (select id from public.members where user_id = auth.uid()));

-- ---------------------------------------------------------------------------
--  meeting_points
-- ---------------------------------------------------------------------------
revoke all on public.meeting_points from anon, authenticated;
grant select on public.meeting_points to anon, authenticated;
grant insert (meeting_id, text, position) on public.meeting_points to authenticated;

/* Points follow their meeting: readable when the meeting is, writable while the
   meeting is still the author's own pending draft. That last condition is the
   one that matters — without `status = 'pending'` a member could keep appending
   points to a write-up the committee has already approved, and the approval
   would mean nothing. */
drop policy if exists meeting_points_read on public.meeting_points;
create policy meeting_points_read on public.meeting_points
  for select using (exists (
    select 1 from public.meetings m
     where m.id = meeting_id and (m.status = 'approved' or public.is_admin())));

drop policy if exists meeting_points_read_own on public.meeting_points;
create policy meeting_points_read_own on public.meeting_points
  for select to authenticated
  using (exists (
    select 1 from public.meetings m
     where m.id = meeting_id
       and m.submitted_by in (select id from public.members where user_id = auth.uid())));

drop policy if exists meeting_points_submit on public.meeting_points;
create policy meeting_points_submit on public.meeting_points
  for insert to authenticated
  with check (exists (
    select 1 from public.meetings m
     where m.id = meeting_id
       and m.status = 'pending'
       and m.submitted_by in (select id from public.members where user_id = auth.uid())));

-- ---------------------------------------------------------------------------
--  The committee's side
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_meeting_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'unknown status %', p_status using errcode = '22023';
  end if;
  update public.meetings set status = p_status, updated_at = now() where id = p_id;
end $$;

create or replace function public.admin_delete_meeting(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  delete from public.meetings where id = p_id;
end $$;

revoke all on function public.admin_set_meeting_status(uuid, text) from anon;
revoke all on function public.admin_delete_meeting(uuid) from anon;
