-- ===========================================================================
--  Nepal-Oita Community — complete database setup, in one file
--
--  Paste the whole thing into the Supabase dashboard's SQL editor and run it
--  once. It is the migrations in supabase/migrations/ concatenated in order;
--  running them one at a time gives exactly the same result.
--
--  GENERATED FILE — do not edit. Change a migration and run:
--      npm run build:sql
--
--  Safe to re-run: every statement is CREATE ... IF NOT EXISTS, CREATE OR
--  REPLACE, or an upsert. Verified by applying it twice to an empty database.
--
--  NOT INCLUDED: 0006_first_admin.sql. That one names the first committee
--  member and has to be edited before it is run, so it stays separate. Run it
--  second, after this file.
--
--  Afterwards, run supabase/verify.sql to see what actually landed.
-- ===========================================================================


-- ###########################################################################
-- ##  0001_members
-- ###########################################################################

-- ===========================================================================
--  Nepal–Oita Community — members, and the line between public and private
--
--  Run order: 0001_members, 0002_rls, 0003_storage, 0004_content, 0005_seed.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
--  members — everything that is safe for the whole internet to read
-- ---------------------------------------------------------------------------
create table if not exists public.members (
  id           uuid primary key default gen_random_uuid(),

  -- Set once, by link_member_to_current_user(), when a member first signs in
  -- with the phone number the committee registered for them. This column is
  -- what makes "your own card and nobody else's" a database fact rather than a
  -- hope: every self-service policy below keys off it, and no member is granted
  -- permission to write it.
  user_id      uuid unique references auth.users(id) on delete set null,

  slug         text unique not null,          -- also the photo folder name
  name         text not null,
  role         text,                          -- President, Event adviser, …
  profession   text,
  initials     text,
  category     text not null default 'general'
                 check (category in ('leadership', 'general')),
  photo_path   text,                          -- path inside the member-photos bucket
  sort_order   integer not null default 100,
  is_published boolean not null default true,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists members_category_idx on public.members (category, sort_order, name);

-- ---------------------------------------------------------------------------
--  member_contacts — the private half
--
--  A SEPARATE TABLE, and that is the whole point. Postgres row-level security
--  works on rows, not columns: if the phone number were a column on `members`,
--  every policy that lets the public read a member's name would also expose it
--  unless somebody remembered a column-level GRANT — and would expose the next
--  private column somebody adds, too. Here the `anon` role holds no grant on
--  this table at all, so it fails safe: a new column added to it is private by
--  default, and no policy mistake on `members` can reach it.
-- ---------------------------------------------------------------------------
create table if not exists public.member_contacts (
  member_id    uuid primary key references public.members(id) on delete cascade,

  -- E.164 with the plus, e.g. +818043164111. This is what identifies the member
  -- at sign-in, so it is the one field a member may never change themselves:
  -- being able to would be an account-takeover in one form submission.
  phone_e164   text unique,

  facebook_url text,
  email        text,
  note         text,                          -- committee's own notes
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  keep updated_at honest
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists members_touch on public.members;
create trigger members_touch before update on public.members
  for each row execute function public.touch_updated_at();

drop trigger if exists member_contacts_touch on public.member_contacts;
create trigger member_contacts_touch before update on public.member_contacts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
--  Linking a signed-in phone to a member row
--
--  Called by the app straight after a successful OTP. Deliberately NOT a
--  trigger on auth.users: a trigger only fires at signup, so a member who
--  signs in before the committee has entered their number would never be
--  linked, and would stay locked out until somebody noticed. Calling this on
--  every sign-in reconciles that case on its own.
--
--  SECURITY DEFINER because it writes members.user_id, which no member is
--  granted. The only thing it will match on is the phone of the caller's own
--  authenticated session, read from auth.users by auth.uid().
-- ---------------------------------------------------------------------------
create or replace function public.link_member_to_current_user()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid    uuid := auth.uid();
  v_phone  text;
  v_member uuid;
begin
  if v_uid is null then
    return null;
  end if;

  -- Already linked: nothing to do, and nothing to re-decide.
  select id into v_member from public.members where user_id = v_uid;
  if v_member is not null then
    return v_member;
  end if;

  select regexp_replace(coalesce(u.phone, ''), '\D', '', 'g')
    into v_phone
    from auth.users u
   where u.id = v_uid;

  if v_phone is null or v_phone = '' then
    return null;                       -- signed in, but not by phone
  end if;

  update public.members m
     set user_id = v_uid
   where m.user_id is null
     and m.id = (
       select c.member_id
         from public.member_contacts c
        where regexp_replace(coalesce(c.phone_e164, ''), '\D', '', 'g') = v_phone
        limit 1
     )
  returning m.id into v_member;

  return v_member;                     -- null = that number is not on the register
end $$;

-- Is the caller a committee admin? SECURITY DEFINER so it reads `members`
-- without going through row-level security, which is what stops the admin
-- policies below from recursing into themselves.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.members where user_id = auth.uid()), false);
$$;

-- Is the caller a member at all? Used by the policy that gates contact details.
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;


-- ###########################################################################
-- ##  0002_rls
-- ###########################################################################

-- ===========================================================================
--  Row-level security, and column-level grants
--
--  These are two different mechanisms doing two different jobs, and the members
--  table needs both:
--
--    RLS decides WHICH ROWS you may touch.        (your own card)
--    GRANTs decide WHICH COLUMNS you may write.   (your profession, not your title)
--
--  RLS alone is not enough. A policy of `using (user_id = auth.uid())` on an
--  UPDATE lets a member change *any* column of their own row — including
--  `role`, so anyone could promote themselves to President, or `is_admin`, so
--  anyone could make themselves a committee admin. The column grants are what
--  stop that, and they are the reason the admin path below goes through
--  functions rather than through a wider grant.
-- ===========================================================================

alter table public.members         enable row level security;
alter table public.member_contacts enable row level security;

-- ---------------------------------------------------------------------------
--  members
-- ---------------------------------------------------------------------------

-- Start from nothing, so anything not named below is denied.
revoke all on public.members from anon, authenticated;

grant select on public.members to anon, authenticated;

-- The only three columns a member may ever write on their own card. Note what
-- is absent: user_id, slug, name, role, category, is_admin, is_published.
grant update (profession, photo_path, updated_at) on public.members to authenticated;

drop policy if exists members_public_read on public.members;
create policy members_public_read on public.members
  for select
  using (is_published or public.is_admin());

drop policy if exists members_update_own on public.members;
create policy members_update_own on public.members
  for update
  to authenticated
  using      (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
--  member_contacts — anon gets no grant at all, so there is nothing to leak
-- ---------------------------------------------------------------------------

revoke all on public.member_contacts from anon, authenticated;

grant select on public.member_contacts to authenticated;
grant update (facebook_url, email, updated_at) on public.member_contacts to authenticated;

-- Signed in is not sufficient: anyone at all can obtain an authenticated
-- session by verifying any phone they control. What opens the directory is
-- being linked to a member row, which only a registered number can do.
drop policy if exists contacts_read_members_only on public.member_contacts;
create policy contacts_read_members_only on public.member_contacts
  for select
  to authenticated
  using (public.is_member());

drop policy if exists contacts_update_own on public.member_contacts;
create policy contacts_update_own on public.member_contacts
  for update
  to authenticated
  using      (member_id in (select id from public.members where user_id = auth.uid()))
  with check (member_id in (select id from public.members where user_id = auth.uid()));

-- ---------------------------------------------------------------------------
--  The committee's own writes
--
--  Through SECURITY DEFINER functions rather than a broader grant. If admins
--  were handled with `grant update on public.members to authenticated` plus an
--  is_admin() policy, that wider grant would also apply to ordinary members —
--  the column restriction above would be gone, and every member could edit
--  their own role and is_admin flag. Grants are per role, not per policy, so
--  there is no way to widen them for admins alone.
--
--  Doing it here also means the app never needs the service-role key, so the
--  key that bypasses all of this does not have to exist in the deployment.
-- ---------------------------------------------------------------------------

create or replace function public.admin_upsert_member(
  p_id         uuid,
  p_slug       text,
  p_name       text,
  p_role       text,
  p_profession text,
  p_category   text,
  p_sort_order integer,
  p_published  boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.members (slug, name, role, profession, category, sort_order,
                                is_published, initials)
    values (p_slug, p_name, nullif(p_role,''), nullif(p_profession,''), p_category,
            coalesce(p_sort_order, 100), coalesce(p_published, true),
            public.initials_for(p_name))
    returning id into v_id;
  else
    update public.members
       set slug         = p_slug,
           name         = p_name,
           role         = nullif(p_role,''),
           profession   = nullif(p_profession,''),
           category     = p_category,
           sort_order   = coalesce(p_sort_order, sort_order),
           is_published = coalesce(p_published, is_published),
           initials     = public.initials_for(p_name)
     where id = p_id
    returning id into v_id;
  end if;

  return v_id;
end $$;

-- Initials for the avatar when no photo has been supplied: "Ganga Bahadur
-- Tamang" gives GT, "Member A" gives MA, a single name gives its first letter.
create or replace function public.initials_for(p_name text)
returns text
language sql
immutable
as $$
  select case
    when p_name is null or btrim(p_name) = '' then '?'
    when array_length(regexp_split_to_array(btrim(p_name), '\s+'), 1) = 1
      then upper(substr(btrim(p_name), 1, 1))
    else upper(substr((regexp_split_to_array(btrim(p_name), '\s+'))[1], 1, 1))
       || upper(substr((regexp_split_to_array(btrim(p_name), '\s+'))
                       [array_length(regexp_split_to_array(btrim(p_name), '\s+'), 1)], 1, 1))
  end;
$$;

create or replace function public.admin_set_member_contact(
  p_member_id uuid,
  p_phone     text,      -- E.164 with the plus, or null to clear
  p_facebook  text,
  p_email     text,
  p_note      text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  insert into public.member_contacts (member_id, phone_e164, facebook_url, email, note)
  values (p_member_id, nullif(p_phone,''), nullif(p_facebook,''),
          nullif(p_email,''), nullif(p_note,''))
  on conflict (member_id) do update
    set phone_e164   = excluded.phone_e164,
        facebook_url = excluded.facebook_url,
        email        = excluded.email,
        note         = excluded.note,
        updated_at   = now();
end $$;

create or replace function public.admin_delete_member(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  -- Guard against the last admin deleting themselves and locking everybody out.
  if (select is_admin from public.members where id = p_id)
     and (select count(*) from public.members where is_admin) <= 1 then
    raise exception 'that is the only admin left' using errcode = '23514';
  end if;
  delete from public.members where id = p_id;
end $$;

create or replace function public.admin_set_admin(p_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  if not p_is_admin
     and (select count(*) from public.members where is_admin) <= 1
     and (select is_admin from public.members where id = p_id) then
    raise exception 'that is the only admin left' using errcode = '23514';
  end if;
  update public.members set is_admin = p_is_admin where id = p_id;
end $$;

revoke all on function public.admin_upsert_member(uuid,text,text,text,text,text,integer,boolean) from anon;
revoke all on function public.admin_set_member_contact(uuid,text,text,text,text) from anon;
revoke all on function public.admin_delete_member(uuid) from anon;
revoke all on function public.admin_set_admin(uuid,boolean) from anon;
revoke all on function public.link_member_to_current_user() from anon;


-- ###########################################################################
-- ##  0003_storage
-- ###########################################################################

-- ===========================================================================
--  Storage buckets
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('member-photos', 'member-photos', true, 5242880,
   array['image/jpeg','image/png','image/webp']),
  ('site-photos',   'site-photos',   true, 10485760,
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
--  member-photos: a member writes only inside their own folder
--
--  The path convention is <member-slug>/<something>.jpg, and the policy
--  compares the first folder segment against the slug of the member row linked
--  to the caller. So the check is not "are you signed in" but "is this folder
--  yours" — uploading over somebody else's portrait is refused by the storage
--  layer itself, whatever the app happens to send.
--
--  The file size limit and mime list on the bucket above are enforced by
--  Storage, not by the browser. The client-side resize is there to save the
--  member's data allowance, not to keep anything out.
-- ---------------------------------------------------------------------------

drop policy if exists "member photos are public to read" on storage.objects;
create policy "member photos are public to read" on storage.objects
  for select using (bucket_id in ('member-photos', 'site-photos'));

drop policy if exists "members write their own folder" on storage.objects;
create policy "members write their own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and (storage.foldername(name))[1] =
        (select slug from public.members where user_id = auth.uid())
  );

drop policy if exists "members replace their own folder" on storage.objects;
create policy "members replace their own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'member-photos'
    and (storage.foldername(name))[1] =
        (select slug from public.members where user_id = auth.uid())
  );

drop policy if exists "members delete their own folder" on storage.objects;
create policy "members delete their own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'member-photos'
    and (storage.foldername(name))[1] =
        (select slug from public.members where user_id = auth.uid())
  );

-- Committee photographs — gallery, event covers. Admins only.
drop policy if exists "admins manage site photos" on storage.objects;
create policy "admins manage site photos" on storage.objects
  for all to authenticated
  using      (bucket_id = 'site-photos' and public.is_admin())
  with check (bucket_id = 'site-photos' and public.is_admin());


-- ###########################################################################
-- ##  0004_content
-- ###########################################################################

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


-- ###########################################################################
-- ##  0005_preview
-- ###########################################################################

-- ===========================================================================
--  Which members the public may see at all
--
--  The static site showed a first row of cards and put the rest behind a
--  "members only" gate — but every name was in the HTML regardless, so the gate
--  was decoration. Here it can be real: the public read policy is narrowed to
--  the handful of members flagged as a public preview, and the rest are simply
--  not returned to an anonymous request. Nothing is hidden in the browser,
--  because nothing is sent to it.
-- ===========================================================================

alter table public.members
  add column if not exists is_public_preview boolean not null default false;

comment on column public.members.is_public_preview is
  'Shown on the public homepage. The remaining members are returned only to a '
  'signed-in member — enforced by the members_public_read policy, not by CSS.';

drop policy if exists members_public_read on public.members;
create policy members_public_read on public.members
  for select
  using (
    (is_published and is_public_preview)   -- the public preview
    or public.is_member()                  -- a verified member sees everyone
    or public.is_admin()                   -- including unpublished drafts
  );

-- The six office holders are the public face of the committee, so they are the
-- preview. Advisers and general members are not.
update public.members
   set is_public_preview = true
 where category = 'leadership'
   and role is not null
   and role not ilike '%adviser%';


-- ###########################################################################
-- ##  0007_seed_members
-- ###########################################################################

-- ===========================================================================
--  The 28 members already on the site, so nobody retypes them.
--
--  Names, roles and which list they belong in — and NO phone numbers. Numbers
--  are added one at a time through the Committee page (or with
--  admin_set_member_contact), because they are the one thing that should never
--  arrive in a file that lives in version control.
--
--  is_public_preview mirrors what the live site already shows a visitor who is
--  not signed in: the six office holders, and the first five entries of the
--  general register as a sample of it. The advisers and the rest of the register
--  are returned to signed-in members only — see 0005_preview.sql.
--
--  Note what that means before you rename these rows. 'Member A' through
--  'Member E' are placeholders and disclose nothing; the moment one is given a
--  real person's name it becomes public. Clear is_public_preview on that row
--  first, or ask them.
--
--  Safe to re-run: it matches on slug and updates rather than duplicating.
-- ===========================================================================

insert into public.members (slug, name, role, category, initials, is_public_preview, sort_order)
values
  ('prakash-rasaili', 'Prakash Rasaili', 'President', 'leadership', 'PR', true, 10),
  ('ganga-bahadur-tamang', 'Ganga Bahadur Tamang', 'Vice President', 'leadership', 'GT', true, 20),
  ('pragya-shah', 'Pragya Shah', 'Secretary', 'leadership', 'PS', true, 30),
  ('binita-lawgun', 'Binita Lawgun', 'Finance Manager', 'leadership', 'BL', true, 40),
  ('prabhakar-niroula', 'Prabhakar Niroula', 'Social Media Handler', 'leadership', 'PN', true, 50),
  ('suresh-surkheti', 'Suresh Surkheti', 'Technical Supporter', 'leadership', 'SS', true, 60),
  ('ashok-lama', 'Ashok Lama', 'Community work adviser', 'leadership', 'AL', false, 70),
  ('ashish-dheke', 'Ashish Dheke', 'Community work adviser', 'leadership', 'AD', false, 80),
  ('mahesh-giri', 'Mahesh Giri', 'Community work adviser', 'leadership', 'MG', false, 90),
  ('shannon-hoon', 'Shannon Hoon', 'Community work adviser', 'leadership', 'SH', false, 100),
  ('eva-tharu', 'Eva Tharu', 'Event adviser', 'leadership', 'ET', false, 110),
  ('yangi-sherpa-gole', 'Yangi Sherpa Gole', 'Event adviser', 'leadership', 'YG', false, 120),
  ('ruby-gauchan', 'Ruby Gauchan', 'Event adviser', 'leadership', 'RG', false, 130),
  ('member-01', 'Member A', null, 'general', 'A', true, 140),
  ('member-02', 'Member B', null, 'general', 'B', true, 150),
  ('member-03', 'Member C', null, 'general', 'C', true, 160),
  ('member-04', 'Member D', null, 'general', 'D', true, 170),
  ('member-05', 'Member E', null, 'general', 'E', true, 180),
  ('member-06', 'Member F', null, 'general', 'F', false, 190),
  ('member-07', 'Member G', null, 'general', 'G', false, 200),
  ('member-08', 'Member H', null, 'general', 'H', false, 210),
  ('member-09', 'Member I', null, 'general', 'I', false, 220),
  ('member-10', 'Member J', null, 'general', 'J', false, 230),
  ('member-11', 'Member K', null, 'general', 'K', false, 240),
  ('member-12', 'Member L', null, 'general', 'L', false, 250),
  ('member-13', 'Member M', null, 'general', 'M', false, 260),
  ('member-14', 'Member N', null, 'general', 'N', false, 270),
  ('member-15', 'Member O', null, 'general', 'O', false, 280)
on conflict (slug) do update
   set name              = excluded.name,
       role              = excluded.role,
       category          = excluded.category,
       initials          = excluded.initials,
       is_public_preview = excluded.is_public_preview,
       sort_order        = excluded.sort_order;

-- A contact row per member, empty for now, so the Committee page has something
-- to attach a number to.
insert into public.member_contacts (member_id)
select id from public.members
on conflict (member_id) do nothing;


-- ###########################################################################
-- ##  0008_seed_content
-- ###########################################################################

-- ===========================================================================
--  The site's existing content, moved out of hand-written HTML and into the
--  database: 10 events, 6 programmes, 6 stories, 12 gallery photographs.
--
--  Extracted from static-site/*.html rather than retyped, so nothing drifts
--  from what the site says today.
--
--  Safe to re-run: every insert matches on a natural key and updates.
--
--  The licence columns on `photos` are not decoration. Several of these images
--  are CC BY-SA and the licence REQUIRES attribution — keeping credit on the row
--  is what stops a future edit quietly dropping it.
-- ===========================================================================


-- A photograph is identified by its file, so the same file must not appear
-- twice. Added here rather than in 0004 so a project that has already applied
-- 0004 picks it up — and because the upsert below needs it to exist.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'photos_storage_path_key') then
    alter table public.photos add constraint photos_storage_path_key unique (storage_path);
  end if;
end $$;

-- ---- events ----------------------------------------------------------
insert into public.events (slug, title, summary, body, event_date, start_time,
                           end_time, place, category, cost, accent, register_email)
values
  ('monthly-community-meetup', 'Monthly Community Meetup', 'The regular Sunday gathering — tea, news, and whatever anyone needs a hand with.', 'Our standing meetup, held on the second Sunday of most months. No agenda beyond seeing each other, though paperwork questions always get answered.', '2026-09-13'::date, '14:00', '17:00', 'Oita Community Centre', 'Community', 'Free for everyone', 'indigo', 'nepaloitacommunity11@gmail.com'),
  ('autumn-football-tournament', 'Autumn Football Tournament', 'Six teams, one trophy, and a great deal of shouting from the touchline.', 'The autumn tournament. Teams are mixed on the day so nobody sits out, and there is no trial to get in.', '2026-09-27'::date, '09:00', '16:00', 'Oita City sports ground', 'Sports', 'Free for members · ¥300 for guests', 'moss', 'nepaloitacommunity11@gmail.com'),
  ('dashain-celebration', 'Dashain Celebration', 'Tika, jamara and the longest lunch of the year, open to the whole prefecture.', 'The biggest date in our calendar. Elders give tika and jamara, and the kitchen runs all afternoon.', '2026-10-18'::date, '11:00', '18:00', 'Oita Cultural Hall', 'Festival', 'Free for members · ¥500 for guests', 'crimson', 'nepaloitacommunity11@gmail.com'),
  ('tihar-and-deepawali', 'Tihar and Deepawali', 'Diyo lamps, rangoli and Bhai Tika, with singing that goes on late.', 'The festival of lights. We light the hall with diyo, lay rangoli at the entrance, and mark Bhai Tika together for anyone whose family is far away.', '2026-11-08'::date, '16:00', '21:00', 'Oita Community Centre', 'Festival', 'Free for members · ¥500 for guests', 'gold', 'nepaloitacommunity11@gmail.com'),
  ('summer-volleyball-afternoon', 'Summer Volleyball Afternoon', 'The indoor season closer, played until the gymnasium threw us out.', 'Our summer sports day. Volleyball is the national sport at home and it shows.', '2026-07-19'::date, '13:00', '18:00', 'Oita City gymnasium', 'Sports', 'Free for members', 'moss', 'nepaloitacommunity11@gmail.com'),
  ('riverside-clean-up', 'Riverside Clean-up', 'A morning on the riverbank with our neighbourhood association.', 'Held with the local neighbourhood association. Being good neighbours is most of what makes the rest possible.', '2026-06-21'::date, '08:00', '11:00', 'Ono River, Oita City', 'Community', 'Free', 'indigo', 'nepaloitacommunity11@gmail.com'),
  ('nepali-language-class-open-day', 'Nepali Language Class Open Day', 'Saturday-morning classes opened up so parents could see the work.', 'The children read aloud for their parents. For families whose children were born in Japan this is the whole point of the classes.', '2026-05-17'::date, '10:00', '12:00', 'Oita Community Centre', 'Cultural', 'Free for members', 'gold', 'nepaloitacommunity11@gmail.com'),
  ('nepali-food-festival', 'Nepali Food Festival', 'Home cooking at scale, with demonstrations, tastings and recipes to take away.', 'Dal bhat, momo and sel roti cooked by member families, with recipes written out for anyone who asked.', '2026-04-05'::date, '11:00', '18:00', 'Oita Cultural Hall', 'Food', 'Free entry · food sold by the plate', 'gold', 'nepaloitacommunity11@gmail.com'),
  ('new-student-orientation', 'New Student Orientation', 'Practical briefing and mentor pairing for students arriving for the spring term.', 'Everything nobody tells you in the first month: ward office, bank, phone, part-time work rules.', '2026-03-22'::date, '14:00', '17:00', 'Oita Community Centre', 'Students', 'Free for everyone', 'indigo', 'nepaloitacommunity11@gmail.com'),
  ('holi-festival-celebration', 'Holi Festival Celebration', 'A day of colour, music and food in the park — our biggest open event of the year.', 'The festival of colours, held outdoors and open to everyone in Oita. Bring white clothes you do not mind ruining, and an appetite.', '2026-03-15'::date, '10:00', '16:00', 'Oita Park, Oita City', 'Festival', 'Free for members · ¥500 for guests', 'crimson', 'nepaloitacommunity11@gmail.com')
on conflict (slug) do update
   set title = excluded.title, summary = excluded.summary, body = excluded.body,
       event_date = excluded.event_date, start_time = excluded.start_time,
       end_time = excluded.end_time, place = excluded.place,
       category = excluded.category, cost = excluded.cost,
       accent = excluded.accent, register_email = excluded.register_email;

-- Highlights are replaced wholesale per event, so re-running cannot double them.
delete from public.event_highlights where event_id = (select id from public.events where slug = 'monthly-community-meetup');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'monthly-community-meetup'), 'Open to members and to anyone thinking of joining', 0),
  ((select id from public.events where slug = 'monthly-community-meetup'), 'Help with forms, contracts and official letters', 1),
  ((select id from public.events where slug = 'monthly-community-meetup'), 'Tea and snacks provided', 2),
  ((select id from public.events where slug = 'monthly-community-meetup'), 'Children welcome', 3);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'autumn-football-tournament');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'autumn-football-tournament'), 'Open teams, all levels, boots not compulsory', 0),
  ((select id from public.events where slug = 'autumn-football-tournament'), 'Families welcome to come and watch', 1),
  ((select id from public.events where slug = 'autumn-football-tournament'), 'Food stall run by member families', 2),
  ((select id from public.events where slug = 'autumn-football-tournament'), 'Trophy presented at the end of the day', 3);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'dashain-celebration');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'dashain-celebration'), 'Tika and jamara from the elders', 0),
  ((select id from public.events where slug = 'dashain-celebration'), 'Full Nepali lunch cooked by member families', 1),
  ((select id from public.events where slug = 'dashain-celebration'), 'Cultural performances through the afternoon', 2),
  ((select id from public.events where slug = 'dashain-celebration'), 'Open to Japanese neighbours and friends', 3),
  ((select id from public.events where slug = 'dashain-celebration'), 'Community photographer on site', 4);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'tihar-and-deepawali');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'tihar-and-deepawali'), 'Diyo lighting and rangoli at the entrance', 0),
  ((select id from public.events where slug = 'tihar-and-deepawali'), 'Bhai Tika for members without family in Japan', 1),
  ((select id from public.events where slug = 'tihar-and-deepawali'), 'Deusi and Bhailo singing', 2),
  ((select id from public.events where slug = 'tihar-and-deepawali'), 'Sel roti and sweets', 3);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'summer-volleyball-afternoon');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'summer-volleyball-afternoon'), 'Mixed teams drawn on the day', 0),
  ((select id from public.events where slug = 'summer-volleyball-afternoon'), 'Beginners very welcome', 1),
  ((select id from public.events where slug = 'summer-volleyball-afternoon'), 'Cold drinks provided', 2);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'riverside-clean-up');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'riverside-clean-up'), 'Gloves and bags provided', 0),
  ((select id from public.events where slug = 'riverside-clean-up'), 'Finished with breakfast together', 1),
  ((select id from public.events where slug = 'riverside-clean-up'), 'Joint effort with the local association', 2);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'nepali-language-class-open-day');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'nepali-language-class-open-day'), 'Reading and writing in Devanagari', 0),
  ((select id from public.events where slug = 'nepali-language-class-open-day'), 'Work from the year on display', 1),
  ((select id from public.events where slug = 'nepali-language-class-open-day'), 'Enrolment for the next term', 2);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'nepali-food-festival');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'nepali-food-festival'), 'Momo folding demonstrations', 0),
  ((select id from public.events where slug = 'nepali-food-festival'), 'Sel roti made on the day', 1),
  ((select id from public.events where slug = 'nepali-food-festival'), 'Recipes to take home', 2),
  ((select id from public.events where slug = 'nepali-food-festival'), 'Vegetarian options throughout', 3);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'new-student-orientation');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'new-student-orientation'), 'Ward office and residence card walkthrough', 0),
  ((select id from public.events where slug = 'new-student-orientation'), 'Opening a bank account', 1),
  ((select id from public.events where slug = 'new-student-orientation'), 'Part-time work rules explained', 2),
  ((select id from public.events where slug = 'new-student-orientation'), 'Paired with a mentor who has done it', 3);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'holi-festival-celebration');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'holi-festival-celebration'), 'Gulal colour-throwing ceremony at midday', 0),
  ((select id from public.events where slug = 'holi-festival-celebration'), 'Live Nepali music and dance', 1),
  ((select id from public.events where slug = 'holi-festival-celebration'), 'Food stalls run by member families', 2),
  ((select id from public.events where slug = 'holi-festival-celebration'), 'Activities for children', 3),
  ((select id from public.events where slug = 'holi-festival-celebration'), 'Raffle for the student support fund', 4);


-- ---- programmes ------------------------------------------------------
insert into public.programmes (slug, title, body, icon, accent, sort_order)
values
  ('cultural-festivals', 'Cultural festivals', 'Dashain, Tihar, Holi and Nepali New Year — celebrated properly, and always open to the wider Oita community.', 'star', 'crimson', 10),
  ('practical-support', 'Practical support', 'The unglamorous work: forms, phone calls, translations and knowing which office to walk into.', 'shield', 'indigo', 20),
  ('a-network-that-answers', 'A network that answers', 'Five hundred people across the prefecture, and a group chat that is awake at 2am when something goes wrong.', 'network', 'moss', 30),
  ('language-and-heritage', 'Language and heritage', 'Nepali for children growing up in Japan, and a hand with Japanese for the adults who need it for work.', 'graduate', 'gold', 40),
  ('sport-and-weekends', 'Sport and weekends', 'Football and volleyball through the warm months — the easiest way into the community if you do not know anybody yet.', 'users', 'moss', 50),
  ('landing-in-oita', 'Landing in Oita', 'The first month is the hardest. Someone who has already done it will walk you through it.', 'home', 'crimson', 60)
on conflict (slug) do update
   set title = excluded.title, body = excluded.body, icon = excluded.icon,
       accent = excluded.accent, sort_order = excluded.sort_order;

delete from public.programme_points where programme_id = (select id from public.programmes where slug = 'cultural-festivals');
insert into public.programme_points (programme_id, text, position) values
  ((select id from public.programmes where slug = 'cultural-festivals'), 'Traditional food and live music', 0),
  ((select id from public.programmes where slug = 'cultural-festivals'), 'Dance and cultural performances', 1),
  ((select id from public.programmes where slug = 'cultural-festivals'), 'Family-friendly, all welcome', 2);

delete from public.programme_points where programme_id = (select id from public.programmes where slug = 'practical-support');
insert into public.programme_points (programme_id, text, position) values
  ((select id from public.programmes where slug = 'practical-support'), 'Visa and residency paperwork', 0),
  ((select id from public.programmes where slug = 'practical-support'), 'Job placement and interviews', 1),
  ((select id from public.programmes where slug = 'practical-support'), 'Housing and guarantor guidance', 2);

delete from public.programme_points where programme_id = (select id from public.programmes where slug = 'a-network-that-answers');
insert into public.programme_points (programme_id, text, position) values
  ((select id from public.programmes where slug = 'a-network-that-answers'), 'Facebook groups for your area', 0),
  ((select id from public.programmes where slug = 'a-network-that-answers'), 'Monthly newsletter', 1),
  ((select id from public.programmes where slug = 'a-network-that-answers'), 'Emergency support chain', 2);

delete from public.programme_points where programme_id = (select id from public.programmes where slug = 'language-and-heritage');
insert into public.programme_points (programme_id, text, position) values
  ((select id from public.programmes where slug = 'language-and-heritage'), 'Nepali reading and writing for children', 0),
  ((select id from public.programmes where slug = 'language-and-heritage'), 'Conversation practice before interviews', 1),
  ((select id from public.programmes where slug = 'language-and-heritage'), 'Help reading official letters', 2);

delete from public.programme_points where programme_id = (select id from public.programmes where slug = 'sport-and-weekends');
insert into public.programme_points (programme_id, text, position) values
  ((select id from public.programmes where slug = 'sport-and-weekends'), 'Open teams, no trials, all levels', 0),
  ((select id from public.programmes where slug = 'sport-and-weekends'), 'Matches in Oita City and Beppu', 1),
  ((select id from public.programmes where slug = 'sport-and-weekends'), 'Families welcome to come and watch', 2);

delete from public.programme_points where programme_id = (select id from public.programmes where slug = 'landing-in-oita');
insert into public.programme_points (programme_id, text, position) values
  ((select id from public.programmes where slug = 'landing-in-oita'), 'Meeting new arrivals at the station', 0),
  ((select id from public.programmes where slug = 'landing-in-oita'), 'Ward office, bank and phone set-up', 1),
  ((select id from public.programmes where slug = 'landing-in-oita'), 'Where to buy Nepali groceries', 2);


-- ---- stories ---------------------------------------------------------
-- Approved: these are already on the live site. New submissions default to pending.
insert into public.stories (author_name, author_role, quote, status, sort_order)
select * from (values
  ('Rajesh Shrestha', 'Student, APU', 'I landed in Beppu with two suitcases and no idea how anything worked. Someone from this community met me at the station. Within a week I had a room, a phone plan and people to eat dinner with.', 'approved', 10),
  ('Sita Gurung', 'Working professional, Oita City', 'The first Dashain I spent here, I cried on the phone to my mother. The next one I spent in a hall in Oita with three hundred people and it felt like home. That is what this group does.', 'approved', 20),
  ('Anil Tamang', 'Factory worker, Nakatsu', 'My Japanese was not good enough to argue with my employer. Two people came with me to translate, and it was sorted the same week. I have a better job now because of them.', 'approved', 30),
  ('Sunita Magar', 'Parent, Oita City', 'My daughter was born here and I was afraid she would grow up with no Nepali at all. She reads to me now on Saturday mornings. That is entirely down to the classes.', 'approved', 40),
  ('Dipesh Bhandari', 'Student, Beppu', 'I came for the football and stayed for everything else. Turning up to a match on my second weekend in Beppu is how I met almost everyone I know in this prefecture.', 'approved', 50),
  ('Kenji Matsuda', 'Neighbour, Oita City', 'We are Japanese and we live next door to the hall. We were invited to our first Tihar four years ago and we have not missed one since. The food alone is worth it.', 'approved', 60)
) as v(author_name, author_role, quote, status, sort_order)
 where not exists (select 1 from public.stories s where s.author_name = v.author_name);


-- ---- gallery photographs --------------------------------------------
insert into public.photos (storage_path, caption, alt, category, credit,
                           credit_url, licence, licence_url, sort_order)
values
  ('dashain-gathering.jpg', 'Dashain', 'Jamara — pale barley shoots grown in the dark for Dashain', 'festivals', '南アジア', 'https://commons.wikimedia.org/wiki/User:南アジア', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0', 10),
  ('monthly-meetup.jpg', 'Monthly meetup', 'Monthly meetup', 'community', null, null, null, null, 20),
  ('traditional-dance.jpg', 'Masked dance', 'Masked Devi Nach dancers in full costume', 'cultural', 'SuyogyaRT', 'https://commons.wikimedia.org/wiki/User:SuyogyaRT', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 30),
  ('tihar.jpg', 'Tihar', 'A clay diyo lamp burning', 'festivals', 'Gaurav Dhwaj Khadka', 'https://commons.wikimedia.org/wiki/User:Gaurav_Dhwaj_Khadka', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 40),
  ('holi-in-the-park.jpg', 'Holi', 'A crowd covered in coloured powder at Holi', 'festivals', 'Bijay Chaurasia', 'https://commons.wikimedia.org/wiki/User:Bijay_Chaurasia', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 50),
  ('student-orientation.jpg', 'Student orientation', 'Student orientation', 'community', null, null, null, null, 60),
  ('food-festival.jpg', 'Dal bhat', 'A dal bhat meal served on a brass plate', 'cultural', '松岡明芳', 'https://commons.wikimedia.org/wiki/User:松岡明芳', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 70),
  ('annual-football-tournament.jpg', 'Annual football tournament', 'Annual football tournament', 'sports', null, null, null, null, 80),
  ('nepali-language-class.jpg', 'Devanagari', 'A page of Bhanubhakta''s Ramayana in Devanagari script', 'cultural', null, null, 'Public domain', null, 90),
  ('volunteer-clean-up.jpg', 'Volunteer clean-up', 'Volunteer clean-up', 'community', null, null, null, null, 100),
  ('nepali-new-year.jpg', 'Nepali New Year', 'An ornate wooden chariot in a Bhaktapur street', 'festivals', 'Nyeta', 'https://commons.wikimedia.org/wiki/User:Nyeta', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 110),
  ('volleyball-afternoon.jpg', 'Volleyball afternoon', 'Volleyball afternoon', 'sports', null, null, null, null, 120)
on conflict (storage_path) do update
   set caption = excluded.caption, alt = excluded.alt, category = excluded.category,
       credit = excluded.credit, credit_url = excluded.credit_url,
       licence = excluded.licence, licence_url = excluded.licence_url,
       sort_order = excluded.sort_order;


-- ###########################################################################
-- ##  0009_messages
-- ###########################################################################

-- ===========================================================================
--  Contact form messages
--
--  On the static site the contact form went nowhere: it validated, showed a
--  success dialog, and discarded what was typed. This gives it somewhere to land.
--
--  Anyone may write; only the committee may read. That asymmetry is the whole
--  point of the table, and it is why `anon` gets an INSERT grant on named
--  columns and no SELECT at all — a visitor must not be able to read other
--  people's messages back out.
-- ===========================================================================

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  phone      text,
  topic      text,
  body       text not null,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_new_idx on public.messages (handled, created_at desc);

alter table public.messages enable row level security;

revoke all on public.messages from anon, authenticated;

-- Named columns only: `handled` is the committee's own bookkeeping, and a
-- visitor who could set it could file their message as already dealt with.
grant insert (name, email, phone, topic, body) on public.messages to anon, authenticated;
grant select, update, delete on public.messages to authenticated;

drop policy if exists messages_anyone_writes on public.messages;
create policy messages_anyone_writes on public.messages
  for insert to anon, authenticated
  with check (
    -- Cheap guards against an empty or obviously junk submission. Not spam
    -- protection; that needs a real service if it ever becomes a problem.
    btrim(name) <> '' and btrim(body) <> '' and length(body) <= 5000
  );

drop policy if exists messages_committee_reads on public.messages;
create policy messages_committee_reads on public.messages
  for select to authenticated using (public.is_admin());

drop policy if exists messages_committee_manages on public.messages;
create policy messages_committee_manages on public.messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists messages_committee_deletes on public.messages;
create policy messages_committee_deletes on public.messages
  for delete to authenticated using (public.is_admin());


-- ###########################################################################
-- ##  0010_public_members_and_socials
-- ###########################################################################

-- ===========================================================================
--  Two changes to what the public sees of a member
--
--  1. EVERY published member is now public — the whole leadership team and the
--     whole general register, not the eleven-card preview.
--
--     Be clear about what that means, because it cannot be undone for anybody
--     who has already been indexed: a name on this list is on the open web. The
--     committee asked for it, and it matches what the old hand-written site did.
--     What has NOT changed is the line that actually matters: phone numbers and
--     email addresses stay in member_contacts, where `anon` holds no grant at
--     all, so there is nothing there for an anonymous request to read.
--
--  2. Social links move onto `members`, which is publicly readable, and a member
--     may edit their own.
--
--     facebook_url used to live on member_contacts alongside the phone number.
--     That was the right place while it was private and the wrong place now:
--     a Facebook or Instagram handle is already public wherever it points, and
--     keeping it in the private table meant the only way to show it was to open
--     that table up — which would have taken the phone numbers with it.
--     Splitting them is the whole point.
-- ===========================================================================

alter table public.members
  add column if not exists facebook_url  text,
  add column if not exists instagram_url text,
  add column if not exists tiktok_url    text;

comment on column public.members.facebook_url is
  'Public. Private contact details stay in member_contacts, which anon cannot read.';

-- Carry across anything already entered, then stop using the old column. It is
-- left in place rather than dropped: dropping it would throw away data if this
-- migration is applied to a database where somebody has filled it in and the
-- copy below has already run once.
update public.members m
   set facebook_url = c.facebook_url
  from public.member_contacts c
 where c.member_id = m.id
   and m.facebook_url is null
   and c.facebook_url is not null;

comment on column public.member_contacts.facebook_url is
  'SUPERSEDED by members.facebook_url, which is public. Kept so no data is lost.';

-- ---------------------------------------------------------------------------
--  Read: everyone published, to everyone.
-- ---------------------------------------------------------------------------
drop policy if exists members_public_read on public.members;
create policy members_public_read on public.members
  for select
  using (is_published or public.is_admin());

comment on column public.members.is_public_preview is
  'NO LONGER CONSULTED by members_public_read — every published member is public '
  'now. Kept because the homepage still uses it to choose which cards to show '
  'above the "see all" control, which is a layout question, not a privacy one.';

-- ---------------------------------------------------------------------------
--  Write: the member's own card, and only these columns.
--
--  Re-granting from scratch rather than adding to the existing grant, so the
--  full list is visible in one place. Still absent, and deliberately: user_id,
--  slug, name, role, category, is_admin, is_published, is_public_preview.
-- ---------------------------------------------------------------------------
revoke update on public.members from authenticated;
grant update (profession, photo_path, facebook_url, instagram_url, tiktok_url,
              updated_at)
  on public.members to authenticated;


-- ###########################################################################
-- ##  0011_claim_codes
-- ###########################################################################

-- ===========================================================================
--  Proving that somebody is who they say they are, without paying for it
--
--  The problem
--  -----------
--  An account is easy: Supabase gives us email and password for nothing. But an
--  account only proves you own an email address, and an email address is not
--  membership. Something has to connect "this person signed up" to "this person
--  is Ganga Bahadur Tamang on the register", or the member directory is open to
--  anybody who can fill in a form.
--
--  What the free options actually are
--  ----------------------------------
--    Phone OTP by SMS   — the strongest, and the one this was built for. Needs a
--                         Twilio-style account: roughly ¥8-10 a message, and a
--                         bill that grows with the community. Ruled out.
--    Email magic links  — Supabase's built-in mailer is rate-limited to a
--                         handful an hour and is explicitly not for production.
--                         A member who cannot get a link cannot get in.
--    Email + password   — free and unlimited. Proves ownership of an email
--                         address and nothing else.
--
--  So: email and password for the ACCOUNT, and a one-time code for the
--  MEMBERSHIP. The committee already hands out membership cards at events and
--  already knows who everybody is — which makes them the verification step,
--  performed in person, for nothing. This just gives that a database.
--
--  How it goes
--  -----------
--    1. Committee issues a code for a member. It is shown once, then only its
--       hash is kept. They give it to that person — on the card, in the group
--       chat, at the next meetup.
--    2. The member signs up with any email and a password of their choosing.
--    3. They enter the code. It links their account to their card and is spent.
--
--  Note what this deliberately does NOT do: it never emails the code, so there
--  is no mail service to pay for, and it does not care whether the email address
--  is confirmed. The code is the credential. The email is only a way to log back
--  in — which is why "Confirm email" can be left off in the dashboard without
--  weakening anything that matters.
--
--  What it is not: proof against a member passing their code to somebody else.
--  Nothing short of checking documents is, and the committee handing the code
--  over in person is the check.
-- ===========================================================================

create table if not exists public.member_claim_codes (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,

  /* SHA-256, not bcrypt, and the reason is worth writing down. bcrypt salts,
     so every stored hash is different and a lookup has to scan every unused row
     and re-hash the input against each — twenty-eight slow hashes per attempt,
     and it gets worse as the community grows. bcrypt exists to defend low
     entropy secrets that people choose; this code is fifty random bits that
     nobody chose, so there is no dictionary to attack and a fast digest is the
     right tool. It is also unique and indexable, which is what makes the lookup
     a single row read. */
  code_sha256 bytea not null unique,

  issued_at   timestamptz not null default now(),
  used_at     timestamptz,
  used_by     uuid
);

create index if not exists member_claim_codes_member_idx
  on public.member_claim_codes (member_id, used_at);

alter table public.member_claim_codes enable row level security;

/* No grant for anon or authenticated at all — not even select. Everything goes
   through the two SECURITY DEFINER functions below, which is what keeps a
   member from reading the table to see whose codes are outstanding. */
revoke all on public.member_claim_codes from anon, authenticated;

-- ---------------------------------------------------------------------------
--  Generating a code
-- ---------------------------------------------------------------------------

/* Ten characters from a thirty-two letter alphabet: fifty bits, printed as
   XXXXX-XXXXX so it can be read down a phone or copied off a card.
   
   I, O, 0 and 1 are not in the alphabet. Somebody is going to read one of these
   out loud to somebody else, and "is that an oh or a zero" is a support request
   the committee should never have to answer. */
create or replace function public.generate_claim_code()
returns text language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes    bytea := gen_random_bytes(10);
  out      text := '';
  i        int;
begin
  for i in 0 .. 9 loop
    -- 256 is a whole multiple of 32, so the modulo is unbiased.
    out := out || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
  end loop;
  return substr(out, 1, 5) || '-' || substr(out, 6, 5);
end $$;

/* Punctuation, spaces and case are all thrown away before hashing, so the code
   matches however it was written down. Used by both functions, so they cannot
   normalise differently — which would produce a code that can be issued and
   never redeemed. */
create or replace function public.normalise_claim_code(p_code text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

create or replace function public.admin_issue_claim_code(p_member_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  if not exists (select 1 from public.members where id = p_member_id) then
    raise exception 'no such member';
  end if;

  -- Any code issued to this member earlier is spent, whether or not it was
  -- used. Two live codes for one card means one of them is a spare key nobody
  -- is keeping track of.
  update public.member_claim_codes
     set used_at = coalesce(used_at, now())
   where member_id = p_member_id and used_at is null;

  v_code := public.generate_claim_code();
  insert into public.member_claim_codes (member_id, code_sha256)
  values (p_member_id, digest(public.normalise_claim_code(v_code), 'sha256'));

  -- Returned once and never again: only the digest is stored.
  return v_code;
end $$;

-- ---------------------------------------------------------------------------
--  Redeeming one
-- ---------------------------------------------------------------------------

create or replace function public.claim_member_with_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid    uuid := auth.uid();
  v_norm   text := public.normalise_claim_code(p_code);
  v_row    public.member_claim_codes;
  v_owner  uuid;
begin
  if v_uid is null then
    raise exception 'Sign in first, then enter your code.';
  end if;

  -- Already linked: hand back the card rather than spending a second code.
  select id into v_owner from public.members where user_id = v_uid;
  if v_owner is not null then
    return v_owner;
  end if;

  if length(v_norm) < 8 then
    raise exception 'That code is too short. It is ten letters and numbers.';
  end if;

  select * into v_row from public.member_claim_codes
   where code_sha256 = digest(v_norm, 'sha256');

  /* One message for "no such code" and for "already used". Telling them apart
     would confirm that a given code was real, which is the one thing an
     attacker guessing codes wants to learn. */
  if v_row.id is null or v_row.used_at is not null then
    raise exception 'That code is not valid. Ask the committee for a new one.';
  end if;

  select user_id into v_owner from public.members where id = v_row.member_id;
  if v_owner is not null and v_owner <> v_uid then
    raise exception 'That card already belongs to an account. Speak to the committee.';
  end if;

  update public.members set user_id = v_uid where id = v_row.member_id;
  update public.member_claim_codes
     set used_at = now(), used_by = v_uid
   where id = v_row.id;

  return v_row.member_id;
end $$;

revoke all on function public.admin_issue_claim_code(uuid) from anon, authenticated;
grant execute on function public.admin_issue_claim_code(uuid) to authenticated;
revoke all on function public.claim_member_with_code(text) from anon;
grant execute on function public.claim_member_with_code(text) to authenticated;
revoke all on function public.generate_claim_code() from anon, authenticated;

-- ---------------------------------------------------------------------------
--  What the committee can see: whether a card has a live code, and whether it
--  has been used. Never the code itself — that is gone the moment it is issued.
-- ---------------------------------------------------------------------------
create or replace function public.admin_claim_code_status()
returns table (member_id uuid, issued_at timestamptz, used_at timestamptz)
language sql security definer set search_path = public as $$
  select c.member_id, c.issued_at, c.used_at
    from public.member_claim_codes c
   where public.is_admin()
     and c.id = (select c2.id from public.member_claim_codes c2
                  where c2.member_id = c.member_id
                  order by c2.issued_at desc limit 1)
$$;

revoke all on function public.admin_claim_code_status() from anon;
grant execute on function public.admin_claim_code_status() to authenticated;


-- ###########################################################################
-- ##  0012_meetings
-- ###########################################################################

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


-- ###########################################################################
-- ##  0013_contributor_role
-- ###########################################################################

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


-- ###########################################################################
-- ##  0014_contributor_photos
-- ###########################################################################

-- ===========================================================================
--  Leadership may add gallery photographs too
--
--  0013 gave the leadership team events and meeting write-ups and stopped
--  there, which left the gallery admin-only for no reason anybody could name:
--  a photograph of last Sunday's football is the least consequential thing on
--  the site, and the officers are the people who took it.
--
--  Same shape as an event, for the same reason: it arrives unpublished and a
--  committee member publishes it. A contributor cannot edit or delete it
--  afterwards, so something has to catch a photograph that turns out to be of
--  somebody who did not want to be photographed — and that is a decision for
--  the committee, not a form.
--
--  TWO barriers had to move, and it is worth knowing why there are two: the
--  `photos` ROW (a caption and a path, in Postgres) and the FILE itself (in
--  Storage, which has its own policies on storage.objects). Opening one without
--  the other gets you a row pointing at a file that was refused, or an orphan
--  file nothing references.
-- ===========================================================================

alter table public.photos
  add column if not exists submitted_by uuid references public.members(id) on delete set null;

comment on column public.photos.submitted_by is
  'Who added it. Null for photographs the committee entered directly.';

/* No update and no delete for a contributor: the photos_admin policy from 0004
   is `for all ... using (is_admin())`, and this only adds a narrower way in.
   `not is_published` is what keeps an unreviewed photograph off the gallery. */
drop policy if exists photos_contribute on public.photos;
create policy photos_contribute on public.photos
  for insert to authenticated
  with check (
    public.can_contribute()
    and not is_published
    and submitted_by in (select id from public.members where user_id = auth.uid())
  );

-- So their own upload does not appear to vanish while it waits.
drop policy if exists photos_read_own on public.photos;
create policy photos_read_own on public.photos
  for select to authenticated
  using (submitted_by in (select id from public.members where user_id = auth.uid()));

-- ---------------------------------------------------------------------------
--  The file. Inside their own folder, and nowhere else.
--
--  The committee's existing gallery files sit at the root of the bucket —
--  'dashain-gathering.jpg' and so on. Confining a contributor to
--  '<their-slug>/…' means an upload can never land on top of one of those,
--  whatever it is named. Without the folder condition, somebody uploading their
--  own 'tihar.jpg' would be refused only by `upsert: false` in the client, which
--  is a client-side promise and therefore not one.
--
--  Insert only. No update, no delete — a contributor cannot replace or remove a
--  file once it is up, which is the same rule as everything else in this tier.
-- ---------------------------------------------------------------------------
drop policy if exists "contributors add site photos in their own folder" on storage.objects;
create policy "contributors add site photos in their own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-photos'
    and public.can_contribute()
    and (storage.foldername(name))[1] =
        (select slug from public.members where user_id = auth.uid())
  );


-- ###########################################################################
-- ##  0015_meeting_authoring
-- ###########################################################################

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


-- ###########################################################################
-- ##  0016_minutes_members_only
-- ###########################################################################

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
