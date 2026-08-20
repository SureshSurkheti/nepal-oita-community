-- ===========================================================================
--  Everything else the committee edits over time: events, stories, photos,
--  and the programmes list.
--
--  These need no per-column rules — a non-admin has no business writing any
--  column — so they use ordinary role grants plus an admin-only policy. That is
--  safe here for the same reason it was NOT safe on `members`: there is no case
--  where an ordinary member may write part of a row.
--
--  The one exception is story submissions, handled at the bottom.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  summary       text,
  body          text,
  -- A date, not a timestamptz. An event is on a day in Oita; storing an instant
  -- invites the bug the static site already had once, where a UTC-midnight date
  -- read as the previous day in Japan and events aged out early.
  event_date    date not null,
  start_time    text,
  end_time      text,
  place         text,
  category      text,                       -- Festival, Sports, Community, …
  cost          text,
  accent        text default 'crimson'
                  check (accent in ('crimson','indigo','moss','gold')),
  cover_path    text,
  register_email text,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists events_date_idx on public.events (event_date desc);

create table if not exists public.event_highlights (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null references public.events(id) on delete cascade,
  text      text not null,
  position  integer not null default 0
);
create index if not exists event_highlights_idx on public.event_highlights (event_id, position);

-- ---------------------------------------------------------------------------
--  programmes — the "what we do" cards
-- ---------------------------------------------------------------------------
create table if not exists public.programmes (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  body        text,
  icon        text default 'star',           -- sprite id without the i- prefix
  accent      text default 'crimson',
  sort_order  integer not null default 100,
  is_published boolean not null default true
);

create table if not exists public.programme_points (
  id           uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  text         text not null,
  position     integer not null default 0
);

-- ---------------------------------------------------------------------------
--  stories — members may submit their own; the committee approves
-- ---------------------------------------------------------------------------
create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references public.members(id) on delete set null,
  author_name text not null,
  author_role text,
  quote       text not null,
  photo_path  text,
  status      text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now()
);
create index if not exists stories_status_idx on public.stories (status, sort_order);

-- ---------------------------------------------------------------------------
--  photos — the gallery, with its licence trail
--
--  credit/credit_url/licence are not decoration: several gallery images are
--  CC BY or CC BY-SA and the licence *requires* attribution. Keeping the
--  fields on the row is what stops a future upload losing its credit.
-- ---------------------------------------------------------------------------
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  caption      text,
  alt          text,
  category     text,                        -- festivals, community, sport, …
  credit       text,
  credit_url   text,
  licence      text,
  licence_url  text,
  taken_on     date,
  sort_order   integer not null default 100,
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists photos_category_idx on public.photos (category, sort_order);

-- ---------------------------------------------------------------------------
--  policies
-- ---------------------------------------------------------------------------
alter table public.events           enable row level security;
alter table public.event_highlights enable row level security;
alter table public.programmes       enable row level security;
alter table public.programme_points enable row level security;
alter table public.stories          enable row level security;
alter table public.photos           enable row level security;

do $$
declare t text;
begin
  foreach t in array array['events','event_highlights','programmes','programme_points','photos']
  loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);

    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())',
      t || '_admin', t);
  end loop;
end $$;

-- Published rows are readable by anyone; unpublished drafts only by admins.
drop policy if exists events_read on public.events;
create policy events_read on public.events
  for select using (is_published or public.is_admin());

drop policy if exists programmes_read on public.programmes;
create policy programmes_read on public.programmes
  for select using (is_published or public.is_admin());

drop policy if exists photos_read on public.photos;
create policy photos_read on public.photos
  for select using (is_published or public.is_admin());

-- Child rows follow their parent's visibility.
drop policy if exists event_highlights_read on public.event_highlights;
create policy event_highlights_read on public.event_highlights
  for select using (exists (
    select 1 from public.events e
     where e.id = event_id and (e.is_published or public.is_admin())));

drop policy if exists programme_points_read on public.programme_points;
create policy programme_points_read on public.programme_points
  for select using (exists (
    select 1 from public.programmes p
     where p.id = programme_id and (p.is_published or public.is_admin())));

-- ---------------------------------------------------------------------------
--  stories: the one table an ordinary member may write to
--
--  Column-level INSERT grants again, for the same reason as `members`: without
--  them a member could insert their own story with status 'approved' and put
--  unreviewed text straight onto the homepage. `status` is not in the list, so
--  it takes its default of 'pending' and only an admin can move it on.
-- ---------------------------------------------------------------------------
revoke all on public.stories from anon, authenticated;
grant select on public.stories to anon, authenticated;
grant insert (member_id, author_name, author_role, quote, photo_path) on public.stories to authenticated;

drop policy if exists stories_read on public.stories;
create policy stories_read on public.stories
  for select using (status = 'approved' or public.is_admin());

-- A member can always see their own submission, whatever state it is in.
--
-- Without this the read policy above covers only approved rows, so a member
-- submits their story and it disappears: no "waiting to be approved", no way to
-- check whether it arrived, and every reason to submit it again. Permissive
-- policies are OR-ed, so this widens the read to approved OR admin OR mine.
drop policy if exists stories_read_own on public.stories;
create policy stories_read_own on public.stories
  for select
  to authenticated
  using (member_id in (select id from public.members where user_id = auth.uid()));

drop policy if exists stories_submit_own on public.stories;
create policy stories_submit_own on public.stories
  for insert to authenticated
  with check (member_id in (select id from public.members where user_id = auth.uid()));

-- The committee's side of it.
create or replace function public.admin_set_story_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  if p_status not in ('pending','approved','rejected') then
    raise exception 'unknown status %', p_status using errcode = '22023';
  end if;
  update public.stories set status = p_status where id = p_id;
end $$;

create or replace function public.admin_delete_story(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  delete from public.stories where id = p_id;
end $$;

revoke all on function public.admin_set_story_status(uuid,text) from anon;
revoke all on function public.admin_delete_story(uuid) from anon;
