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
  -- Since 0010 the whole register is public. The count is asserted alongside
  -- the two things that must NOT have come with it, because "28 rows" on its own
  -- is equally consistent with having opened the private table by mistake.
  do $$
  declare n int; c int;
  begin
    select count(*) into n from public.members;
    select count(*) into c from public.member_contacts;
    if n = 28 and c = 0 then
      raise notice 'PASS  the public is served all 28 members and no contact rows';
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

  -- Give a general member a number, the way the Committee page does.
  do $$
  declare v uuid;
  begin
    select id into v from public.members where slug = 'member-01';
    perform public.admin_set_member_contact(v, '+818011112222', null, null, null);
    raise notice 'PASS  a number was registered for Member A';
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
    select id into v from public.members where slug='member-01';
    perform public.admin_set_member_contact(v,'+818011112222',null,null,null);
  end $$;
commit;

begin;
  select test_as('88888888-8888-8888-8888-888888888888');
  do $$
  declare v uuid;
  begin
    v := public.link_member_to_current_user();
    if v is not null then raise notice 'PASS  Member A signs in and gets their own card';
    else raise notice 'FAIL  Member A could not link'; end if;
  end $$;
  -- Row count, not "did it error". An UPDATE that matches nothing succeeds
  -- quietly, so this assertion passed for a while even though Member A was
  -- never linked to a card at all.
  do $$
  declare n int;
  begin
    update public.members set profession='Nurse' where user_id = auth.uid();
    get diagnostics n = row_count;
    if n = 1 then raise notice 'PASS  Member A can set their own profession (1 row)';
    else raise notice 'FAIL  it changed % rows, expected 1', n; end if;
  exception when others then
    raise notice 'FAIL  Member A could not set their profession: %', sqlerrm;
  end $$;
  select expect('Member A CANNOT promote themselves to President',
    'update public.members set role=''President'' where user_id = auth.uid()', false);
  select expect('Member A CANNOT grant themselves committee access',
    'update public.members set is_admin=true where user_id = auth.uid()', false);
  select expect('Member A CANNOT add anybody',
    'select public.admin_upsert_member(null,''x'',''X'',null,null,''general'',1,true)', false);
rollback;
