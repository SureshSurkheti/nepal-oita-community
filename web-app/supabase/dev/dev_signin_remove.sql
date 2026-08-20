-- ===========================================================================
--  Removes the development sign-in bypass.
--
--  Run this before the site goes live, and turn Anonymous sign-ins back off in
--  the dashboard. Dropping the function is what actually closes the hole; the
--  dashboard toggle stops new anonymous sessions being created at all.
--
--  It also unpicks the links the bypass made. A member card claimed by an
--  anonymous session would otherwise stay claimed, and the real person would
--  find their own number could not reach their profile — with nothing on screen
--  to explain why.
-- ===========================================================================

drop function if exists public.dev_sign_in_as(text);
drop function if exists public.dev_member_choices();

do $$
declare n int := 0;
begin
  -- is_anonymous arrived in a later version of Supabase Auth than some projects
  -- are running, so it is checked for rather than assumed.
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'auth' and table_name = 'users'
       and column_name = 'is_anonymous'
  ) then
    update public.members m
       set user_id = null
     where m.user_id in (select u.id from auth.users u where u.is_anonymous);
    get diagnostics n = row_count;
    raise notice 'Bypass removed. % member card(s) released.', n;
  else
    raise notice 'Bypass removed. Could not tell which sessions were anonymous '
                 '(this project predates auth.users.is_anonymous), so check '
                 'members.user_id by hand if anything looks wrong.';
  end if;
end $$;
