\pset format unaligned
\t on
set client_min_messages = notice;

-- ---------------------------------------------------------------------------
--  The development sign-in bypass. It is the one thing in this project that
--  deliberately weakens the front door, so the tests here are less about it
--  working and more about the two ways it could quietly cause harm:
--  claiming a card that belongs to somebody, and staying behind after removal.
-- ---------------------------------------------------------------------------

\echo ''
\echo '=== the development sign-in bypass ==='

-- An anonymous session, the way signInAnonymously() leaves one.
insert into auth.users (id, is_anonymous) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', true)
on conflict do nothing;

begin;
  select test_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
  -- With no argument it should land on a committee card that nobody owns. On
  -- this database the bootstrapped admin IS owned (04 signed them in), so the
  -- right answer here is a different unclaimed card, not a refusal.
  do $$
  declare r record; v_owner uuid;
  begin
    select * into r from public.dev_sign_in_as(null);
    select user_id into v_owner from public.members where id = r.member_id;
    if r.member_name is not null and v_owner = auth.uid() then
      raise notice 'PASS  with no argument it borrows an unclaimed card (%)', r.member_name;
    else
      raise notice 'FAIL  got % owned by %', r.member_name, v_owner;
    end if;
  end $$;

  -- The point of the whole exercise: a real session, so the policies apply and
  -- the member-only data is actually there. A bypass that showed the members
  -- page with nothing on it would be worse than no bypass at all.
  do $$
  declare n int; c int;
  begin
    select count(*) into n from public.members;
    select count(*) into c from public.member_contacts;
    if n = 28 and c > 0 then
      raise notice 'PASS  and then sees all % members and % contact rows, as a member does', n, c;
    else
      raise notice 'FAIL  sees % members and % contact rows', n, c;
    end if;
  end $$;
rollback;

begin;
  select test_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
  do $$
  declare r record;
  begin
    select * into r from public.dev_sign_in_as('member-01');
    if r.member_name = 'Member A' and not r.is_committee then
      raise notice 'PASS  a named slug signs you in as that member, without committee access';
    else
      raise notice 'FAIL  got % (admin=%)', r.member_name, r.is_committee;
    end if;
  end $$;
rollback;

begin;
  select test_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
  do $$ begin
    perform public.dev_sign_in_as('no-such-person');
    raise notice 'FAIL  it accepted a slug that does not exist';
  exception when others then
    raise notice 'PASS  an unknown slug is refused';
  end $$;
rollback;

-- The important one. Once a real person owns a card, the bypass must not be
-- able to take it from them: they would be locked out of their own profile with
-- nothing on screen to say why.
insert into auth.users (id, phone) values
  ('11111111-1111-1111-1111-111111111111', '819000000001')
on conflict do nothing;

begin;
  update public.members set user_id = '11111111-1111-1111-1111-111111111111'
   where slug = 'member-02';
  select test_as('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
  do $$ begin
    perform public.dev_sign_in_as('member-02');
    raise notice 'FAIL  it stole a card that belonged to a real account';
  exception when others then
    raise notice 'PASS  it refuses a card that already belongs to somebody';
  end $$;
rollback;

-- No session at all: the app calls signInAnonymously() first, and if the
-- dashboard toggle is still off that call fails silently. Reaching here with no
-- uid has to say so, not return nothing.
begin;
  select test_anon();
  do $$ begin
    perform public.dev_sign_in_as(null);
    raise notice 'FAIL  it worked with no session';
  exception when others then
    raise notice 'PASS  with no session it names the dashboard toggle';
  end $$;
rollback;

-- Every use of the bypass strands a card on a session that never returns. If
-- they are not released, the register runs out of borrowable cards and — the
-- real damage — the actual member can never claim their own, because
-- link_member_to_current_user() insists on a null user_id.
begin;
  select test_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
  -- PERFORM is PL/pgSQL, not SQL: at the top level of a script it is a syntax
  -- error, which aborts the transaction and takes the assertion below with it.
  do $$ begin perform public.dev_sign_in_as('member-04'); end $$;
  select test_as('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
  do $$
  declare v_owner uuid; r record;
  begin
    select * into r from public.dev_sign_in_as('member-05');
    select user_id into v_owner from public.members where slug = 'member-04';
    if v_owner is null and r.member_name = 'Member E' then
      raise notice 'PASS  a new session releases the card the last one stranded';
    else
      raise notice 'FAIL  member-04 still held by %', v_owner;
    end if;
  end $$;
rollback;

-- ...but a card belonging to a real account is still not touched by that sweep.
begin;
  update public.members set user_id = '11111111-1111-1111-1111-111111111111'
   where slug = 'member-06';
  select test_as('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
  do $$
  declare v_owner uuid;
  begin
    perform public.dev_sign_in_as('member-07');
    select user_id into v_owner from public.members where slug = 'member-06';
    if v_owner = '11111111-1111-1111-1111-111111111111' then
      raise notice 'PASS  and leaves a card owned by a real account alone';
    else
      raise notice 'FAIL  the sweep released a real account''s card';
    end if;
  end $$;
rollback;
