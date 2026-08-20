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
