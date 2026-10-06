-- ===========================================================================
--  A word from the president
--
--  The home page introduces the community with a photograph, four figures and
--  a list of what we do. What it never does is have a person say anything.
--  Somebody who has just landed in Japan and found this site has no way to tell
--  whether there is anybody behind it — and for a small community organisation
--  that is the one question that matters before they turn up to an event alone.
--
--  So: two columns on `members`, for a short signed message from whoever holds
--  the office. The band renders only when `welcome` has words in it. An empty
--  column is an invisible section, which is the right default — a placeholder
--  greeting nobody wrote is worse than no greeting.
--
--  WHY ON `members` AND NOT A SETTINGS TABLE
--  The message is signed, and everything a signature needs is already on the
--  row: the name, the office, the portrait, the published flag. A separate
--  table would duplicate all four and go stale the day the committee changes.
--  Put the words on the person, and the band follows the office automatically.
--
--  WHO MAY WRITE IT
--  Admins, through a function, exactly as the member profile fields work (see
--  0019). NOT a widened grant: `grant update (...) on members to authenticated`
--  is shared with every signed-in member, so widening it would let any member
--  write a welcome message onto their own card and have it appear on the front
--  page of the site. A SECURITY DEFINER that checks is_admin() is the only
--  shape that says "the committee, on anybody's row".
--
--  A SEPARATE FUNCTION, not two more arguments on admin_set_member_profile.
--  Adding arguments to that one means dropping and recreating it, and a browser
--  calling the new signature against a database that has not had this file run
--  would fail on EVERY profile save, not just the new field. A new function
--  fails only at the new thing, and says so.
-- ===========================================================================

alter table public.members add column if not exists welcome    text;
alter table public.members add column if not exists welcome_ne text;

comment on column public.members.welcome is
  'Short signed message shown on the home page. Empty means no band.';

-- ---------------------------------------------------------------------------
--  Writing it
--
--  NULL MEANS LEAVE IT ALONE, EMPTY STRING MEANS CLEAR IT — the same contract
--  as admin_set_member_profile, so the two forms behave the same way and
--  clearing the Nepali half does not require clearing the English one.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_member_welcome(
  p_member_id  uuid,
  p_welcome    text default null,
  p_welcome_ne text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  update public.members set
    welcome    = case when p_welcome    is null then welcome
                      else nullif(btrim(p_welcome), '')    end,
    welcome_ne = case when p_welcome_ne is null then welcome_ne
                      else nullif(btrim(p_welcome_ne), '') end,
    updated_at = now()
  where id = p_member_id;

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'no such member';
  end if;
end $$;

revoke all on function public.admin_set_member_welcome(uuid,text,text)
  from anon, authenticated;
grant execute on function public.admin_set_member_welcome(uuid,text,text)
  to authenticated;

-- ---------------------------------------------------------------------------
--  NOT SEEDED. There is deliberately no INSERT or UPDATE here putting words in
--  the president's mouth. The band stays hidden until he writes his own, from
--  the committee page. A signed welcome that the person named did not write is
--  not a nice touch, it is a forgery.
-- ---------------------------------------------------------------------------
