-- ===========================================================================
--  DEVELOPMENT SIGN-IN BYPASS — REMOVE BEFORE THE SITE GOES LIVE
--
--  What this is for
--  ----------------
--  Phone sign-in needs an SMS account (Twilio and the rest) that this project
--  does not have yet, so there is currently no way to look at the members-only
--  half of the site at all. This installs a temporary way in: pick a member,
--  type 123456, and you are signed in as them.
--
--  What it actually does
--  ---------------------
--  It does NOT weaken any policy. Every rule about who may read a phone number
--  or edit a card is untouched, and the session you get is a real one, so what
--  you see is exactly what that member would see. All this does is hand you a
--  session belonging to a member without checking that you are them.
--
--  Which is the whole problem: ANYONE who can reach the site can do the same.
--  While this function exists, the member register and every stored phone
--  number are effectively public. That is an acceptable trade on a laptop and
--  is not acceptable anywhere else.
--
--  Before you run it
--  -----------------
--  Turn on anonymous sessions, which is what it hangs off:
--      Supabase dashboard -> Authentication -> Sign In / Providers
--        -> Anonymous sign-ins -> enable
--  No SMS provider, no card, no credentials.
--
--  Then set this in web-app/.env.local, or the app will not offer it:
--      NEXT_PUBLIC_DEV_SIGNIN=1
--
--  To take it away again
--  ---------------------
--      supabase/dev/dev_signin_remove.sql
--
--  and turn Anonymous sign-ins back off. verify.sql reports whether this is
--  still installed, so a deploy checklist can catch it.
--
--  This file is deliberately NOT in supabase/migrations/ and is NOT part of
--  setup.sql. It cannot be installed by accident.
-- ===========================================================================

create or replace function public.dev_sign_in_as(p_slug text default null)
returns table (member_id uuid, member_name text, is_committee boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid    uuid := auth.uid();
  v_member uuid;
  v_owner  uuid;
begin
  -- There has to be a session to attach to. The app calls signInAnonymously()
  -- immediately before this; if that failed, say so plainly rather than
  -- returning an empty row that the caller will read as "no such member".
  if v_uid is null then
    raise exception 'dev_sign_in_as: no session. Anonymous sign-ins are probably '
                    'still switched off in the Supabase dashboard.';
  end if;

  /* Only ever claim a card that nobody owns, or one this same session already
     owns. Overwriting user_id on a card that belongs to a real person would
     lock that person out of their own profile, with nothing on screen to say
     why — a far worse outcome than this convenience is worth.

     So when no member is named, that condition is part of the CHOICE rather
     than a check applied afterwards. The first version picked the first admin
     and then refused if it was taken, which meant the default stopped working
     the moment the committee member who installed this signed in once — the
     most likely card of all to be claimed, chosen by default. */
  /* First, release every card held by some OTHER anonymous session.
     
     Each use of this bypass leaves a card linked to a throwaway session that
     will never come back, so without this the pool of borrowable cards silts up
     one sign-in at a time — and worse, the real member whose card it is can
     never claim it, because link_member_to_current_user() only takes a card
     with a null user_id. They would sign in with the right number and be told
     they are not on the register. Testing this feature was itself enough to
     strand two cards that way.
     
     Only anonymous holders, and never the caller's own: a card linked to a real
     account is left alone here exactly as it is below. */
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'auth' and table_name = 'users'
       and column_name = 'is_anonymous'
  ) then
    update public.members m
       set user_id = null
     where m.user_id is not null
       and m.user_id <> v_uid
       and m.user_id in (select u.id from auth.users u where u.is_anonymous);
  end if;

  if p_slug is null or btrim(p_slug) = '' then
    select id into v_member from public.members
     where is_admin and (user_id is null or user_id = v_uid)
     order by sort_order limit 1;
    if v_member is null then
      select id into v_member from public.members
       where user_id is null or user_id = v_uid
       order by sort_order limit 1;
    end if;
    if v_member is null then
      raise exception 'dev_sign_in_as: every member card is already linked to a '
                      'real account, so there is none to borrow.';
    end if;
  else
    select id into v_member from public.members where slug = btrim(p_slug);
    if v_member is null then
      raise exception 'dev_sign_in_as: no member with slug %', p_slug;
    end if;

    select user_id into v_owner from public.members where id = v_member;
    if v_owner is not null and v_owner <> v_uid then
      raise exception 'dev_sign_in_as: % is already linked to a real account. '
                      'Pick another member.', btrim(p_slug);
    end if;
  end if;

  update public.members set user_id = v_uid where id = v_member;

  return query
    select m.id, m.name, m.is_admin from public.members m where m.id = v_member;
end $$;

revoke all on function public.dev_sign_in_as(text) from public;
grant execute on function public.dev_sign_in_as(text) to anon, authenticated;

comment on function public.dev_sign_in_as(text) is
  'DEVELOPMENT ONLY. Hands the caller a session belonging to any member without '
  'verifying who they are. Drop it with supabase/dev/dev_signin_remove.sql '
  'before this site is published.';

-- A list for the picker on the sign-in screen. Names and roles only — this
-- returns no phone number and no contact row, so leaving it installed by
-- mistake is not the same class of error as leaving the function above.
create or replace function public.dev_member_choices()
returns table (slug text, name text, role text, category text, is_admin boolean)
language sql
security definer
set search_path = public
as $$
  select m.slug, m.name, m.role, m.category, m.is_admin
    from public.members m
   where m.is_published
   order by m.is_admin desc, m.sort_order
$$;

revoke all on function public.dev_member_choices() from public;
grant execute on function public.dev_member_choices() to anon, authenticated;

do $$ begin
  raise notice 'Development sign-in installed. Code is 123456. REMOVE BEFORE LAUNCH.';
end $$;
