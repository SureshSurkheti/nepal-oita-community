\pset format unaligned
\t on
set client_min_messages = notice;
\echo ''
\echo '=== who can see which members ==='

-- 0010 opened the register: every published member is public now, leadership and
-- general alike. That moves the whole weight of the privacy story onto one
-- thing — that member_contacts is still unreadable — so these tests are about
-- the line that is left, not the one that was removed.

begin;
  select test_anon();
  do $$
  declare n int; names text;
  begin
    select count(*), coalesce(string_agg(name, ', ' order by name), '(none)') into n, names
      from public.members;
    if n = 3 then raise notice 'PASS  the public is served all 3 published members: %', names;
    else raise notice 'FAIL  the public is served % members (%), expected 3', n, names; end if;
  end $$;

  -- ...and not the draft. Without this the policy could be `using (true)` and
  -- every other assertion here would still pass.
  do $$
  declare n int;
  begin
    select count(*) into n from public.members where slug = 'draft-person';
    if n = 0 then raise notice 'PASS  and not the unpublished draft';
    else raise notice 'FAIL  the unpublished draft is public'; end if;
  end $$;

  -- The one that matters. Names are open; the way to reach anybody is not.
  select expect('and still cannot read one contact row',
    'select count(*) from public.member_contacts', false);
rollback;

begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$ begin perform public.link_member_to_current_user(); end $$;
  do $$
  declare n int; c int;
  begin
    select count(*) into n from public.members;
    select count(*) into c from public.member_contacts;
    if n = 3 and c = 4 then
      raise notice 'PASS  a verified member sees the same 3, plus every contact row';
    else raise notice 'FAIL  member sees % members and % contacts', n, c; end if;
  end $$;
rollback;

begin;
  select test_as('33333333-3333-3333-3333-333333333333');
  do $$
  declare n int; c int;
  begin
    select count(*) into n from public.members;
    select count(*) into c from public.member_contacts;
    -- An account is not a membership. Signing up with any email must buy exactly
    -- what a stranger already had.
    if n = 3 and c = 0 then
      raise notice 'PASS  an account that has not claimed a card gets no contacts';
    else raise notice 'FAIL  unclaimed account saw % members and % contacts', n, c; end if;
  end $$;
rollback;

\echo ''
\echo '=== social links are public, phone numbers are not ==='
begin;
  select test_anon();
  do $$
  declare v text;
  begin
    select facebook_url into v from public.members where slug = 'suresh-surkheti';
    -- 0010 copied it across from member_contacts on the way past.
    if v = 'https://facebook.com/one' then
      raise notice 'PASS  a visitor reads the Facebook link off members';
    else raise notice 'FAIL  facebook_url on members is %', coalesce(v, 'null'); end if;
  end $$;
rollback;
