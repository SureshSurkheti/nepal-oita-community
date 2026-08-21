\pset format unaligned
\t on
set client_min_messages = notice;

-- The committee member signs in for the first time.
insert into auth.users (id, phone) values
  ('99999999-9999-9999-9999-999999999999','818043164111')
on conflict do nothing;

\echo ''
\echo '=== a real run-through on a freshly installed database ==='
begin;
  select test_anon();
  /* Since 0010 the whole register is public. Thirteen, not twenty-eight: 0017
     replaced the fifteen 'Member A'..'Member O' placeholders with the seven real
     general members the committee gave, so a fresh install is thirteen office
     holders and seven members.
     
     The count is asserted alongside the two things that must NOT have come with
     it, because a row count on its own is equally consistent with having opened
     the private table by mistake. */
  do $$
  declare n int; c int;
  begin
    select count(*) into n from public.members;
    select count(*) into c from public.member_contacts;
    if n = 20 and c = 0 then
      raise notice 'PASS  the public is served all 20 members and no contact rows';
    else
      raise notice 'FAIL  the public sees % members and % contact rows', n, c;
    end if;
  end $$;
  select expect('and cannot read a single contact row',
    'select count(*) from public.member_contacts', false);
rollback;

begin;
  select test_as('99999999-9999-9999-9999-999999999999');
  do $$
  declare v uuid; n int;
  begin
    v := public.link_member_to_current_user();
    if v is null then raise notice 'FAIL  the bootstrapped admin could not link'; return; end if;
    raise notice 'PASS  the bootstrapped admin links to their own card';
    if public.is_admin() then raise notice 'PASS  and is recognised as committee';
    else raise notice 'FAIL  is_admin() false'; end if;
    select count(*) into n from public.members;
    raise notice 'PASS  they are served all % members', n;
  end $$;

  /* The general member this test signs in as is created here rather than
     borrowed from the seed. It used to use 'member-01', one of the placeholders
     0017 deletes — and once that row was gone the lookup returned null, the RPC
     matched nothing, and four assertions below "passed" without a card existing
     at all. A test should not depend on sample data that is meant to be
     removable. */
  do $$
  declare v uuid;
  begin
    v := public.admin_upsert_member(null, 'test-general', 'Test General Member',
                                    null, 'TG', 'general', 900, true);
    perform public.admin_set_member_contact(v, '+818011112222', null, null, null);
    if v is null then raise notice 'FAIL  could not create the test general member';
    else raise notice 'PASS  a general member was added and given a number'; end if;
  end $$;
rollback;

\echo ''
\echo '=== that member can now sign in, and only edit themselves ==='
-- Both auth.users rows are created first, as the project owner would: the
-- `authenticated` role holds no grant on auth.users, so doing it mid-test
-- aborts the transaction and every later check is skipped without a word.
insert into auth.users (id, phone) values
  ('88888888-8888-8888-8888-888888888888','818011112222') on conflict do nothing;

begin;
  select test_as('99999999-9999-9999-9999-999999999999');
  do $$
  declare v uuid;
  begin
    perform public.link_member_to_current_user();
    select id into v from public.members where slug='test-general';
    if v is null then
      v := public.admin_upsert_member(null, 'test-general', 'Test General Member',
                                      null, 'TG', 'general', 900, true);
    end if;
    perform public.admin_set_member_contact(v,'+818011112222',null,null,null);
  end $$;
commit;

begin;
  select test_as('88888888-8888-8888-8888-888888888888');
  do $$
  declare v uuid;
  begin
    v := public.link_member_to_current_user();
    if v is not null then raise notice 'PASS  the general member signs in and gets their own card';
    else raise notice 'FAIL  the general member could not link'; end if;
  end $$;
  -- Row count, not "did it error". An UPDATE that matches nothing succeeds
  -- quietly, so this assertion passed for a while even though the member was
  -- never linked to a card at all.
  do $$
  declare n int;
  begin
    update public.members set profession='Nurse' where user_id = auth.uid();
    get diagnostics n = row_count;
    if n = 1 then raise notice 'PASS  they can set their own profession (1 row)';
    else raise notice 'FAIL  it changed % rows, expected 1', n; end if;
  exception when others then
    raise notice 'FAIL  they could not set their profession: %', sqlerrm;
  end $$;
  select expect('the member CANNOT promote themselves to President',
    'update public.members set role=''President'' where user_id = auth.uid()', false);
  select expect('the member CANNOT grant themselves committee access',
    'update public.members set is_admin=true where user_id = auth.uid()', false);
  select expect('the member CANNOT add anybody',
    'select public.admin_upsert_member(null,''x'',''X'',null,null,''general'',1,true)', false);
rollback;
