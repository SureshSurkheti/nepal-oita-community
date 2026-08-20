\pset format unaligned
\t on
set client_min_messages = notice;

\echo ''
\echo '=== meeting decisions ==='

begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$ begin perform public.link_member_to_current_user(); end $$;

  do $$
  declare v_id uuid; v_status text;
  begin
    insert into public.meetings (held_on, title, summary, submitted_by)
    values ('2026-08-09', 'August monthly meeting', 'Held at the community centre.',
            (select id from public.members where user_id = auth.uid()))
    returning id into v_id;

    insert into public.meeting_points (meeting_id, text, position) values
      (v_id, 'Annual fee stays at 3,000 yen', 0),
      (v_id, 'Dashain booking confirmed for 18 October', 1);

    select status into v_status from public.meetings where id = v_id;
    if v_status = 'pending' then
      raise notice 'PASS  a member can write up a meeting, and it lands as pending';
    else
      raise notice 'FAIL  it landed as %', v_status;
    end if;
  end $$;

  -- The grant is column-scoped, so this is the assertion that matters: a member
  -- cannot put an approved decision on the site by asking nicely.
  do $$
  declare v_id uuid;
  begin
    select id into v_id from public.meetings where title = 'August monthly meeting';
    update public.meetings set status = 'approved' where id = v_id;
    raise notice 'FAIL  a member approved their own write-up';
  exception when others then
    raise notice 'PASS  and cannot approve it themselves';
  end $$;

  -- ...and they can still see it, or they would file it again thinking it was
  -- lost.
  do $$
  declare n int;
  begin
    select count(*) into n from public.meetings where title = 'August monthly meeting';
    if n = 1 then raise notice 'PASS  the author still sees their own pending write-up';
    else raise notice 'FAIL  the author cannot see it'; end if;
  end $$;

  -- Somebody else's meeting is not theirs to add points to.
  do $$
  declare v_other uuid;
  begin
    insert into public.meetings (held_on, title, submitted_by)
    values ('2026-07-12', 'Someone elses write-up',
            'aaaaaaaa-0000-0000-0000-000000000001');
    raise notice 'FAIL  a member filed a write-up under another member';
  exception when others then
    raise notice 'PASS  a member cannot file one under somebody else';
  end $$;
commit;

begin;
  select test_anon();
  do $$
  declare n int;
  begin
    select count(*) into n from public.meetings;
    if n = 0 then raise notice 'PASS  a visitor sees nothing until it is approved';
    else raise notice 'FAIL  a visitor sees % unapproved write-up(s)', n; end if;
  end $$;
  do $$
  declare n int;
  begin
    select count(*) into n from public.meeting_points;
    if n = 0 then raise notice 'PASS  nor any of its points';
    else raise notice 'FAIL  % point(s) leaked', n; end if;
  end $$;
rollback;

\echo ''
\echo '=== the committee approves it ==='
begin;
  select test_as('11111111-1111-1111-1111-111111111111');
  -- is_admin() reads members.user_id, so the account has to be linked to its
  -- card before it counts as committee. Without this the admin RPCs below raise
  -- 'not authorised' and every assertion in the block disappears with the
  -- transaction.
  do $$ begin perform public.link_member_to_current_user(); end $$;
  -- Asserted by re-reading the row, not by the call not throwing.
  -- admin_set_meeting_status ends in an UPDATE with a WHERE clause: hand it an id
  -- it cannot see and it matches nothing, returns quietly, and a test that only
  -- watched for an exception would call that a pass. It did, once.
  do $$
  declare v_id uuid; v_status text;
  begin
    select id into v_id from public.meetings where title = 'August monthly meeting';
    if v_id is null then
      raise notice 'FAIL  the committee cannot even see the pending write-up';
      return;
    end if;
    perform public.admin_set_meeting_status(v_id, 'approved');
    select status into v_status from public.meetings where id = v_id;
    if v_status = 'approved' then raise notice 'PASS  the committee can approve it';
    else raise notice 'FAIL  status is still %', v_status; end if;
  end $$;
commit;

begin;
  select test_anon();
  do $$
  declare n int; pts int;
  begin
    select count(*) into n from public.meetings where status = 'approved';
    select count(*) into pts from public.meeting_points;
    if n = 1 and pts = 2 then
      raise notice 'PASS  and then a visitor reads it, with both points';
    else
      raise notice 'FAIL  visitor sees % meeting(s) and % point(s)', n, pts;
    end if;
  end $$;
rollback;

-- Approval has to mean something. Appending to an approved write-up would let a
-- member slip a decision past the committee after the fact.
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$
  declare v_id uuid;
  begin
    select id into v_id from public.meetings where title = 'August monthly meeting';
    insert into public.meeting_points (meeting_id, text, position)
    values (v_id, 'And we also agreed to something nobody voted on', 9);
    raise notice 'FAIL  a point was added after approval';
  exception when others then
    raise notice 'PASS  no points can be added once it is approved';
  end $$;
rollback;

begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$
  declare v_id uuid;
  begin
    select id into v_id from public.meetings where title = 'August monthly meeting';
    perform public.admin_delete_meeting(v_id);
    raise notice 'FAIL  a member deleted a meeting';
  exception when others then
    raise notice 'PASS  and a member cannot delete one';
  end $$;
rollback;

begin;
  select test_as('11111111-1111-1111-1111-111111111111');
  -- is_admin() reads members.user_id, so the account has to be linked to its
  -- card before it counts as committee. Without this the admin RPCs below raise
  -- 'not authorised' and every assertion in the block disappears with the
  -- transaction.
  do $$ begin perform public.link_member_to_current_user(); end $$;
  do $$
  declare v_id uuid; n int;
  begin
    select id into v_id from public.meetings where title = 'August monthly meeting';
    perform public.admin_delete_meeting(v_id);
    select count(*) into n from public.meeting_points where meeting_id = v_id;
    if n = 0 then raise notice 'PASS  the committee can delete one, points and all';
    else raise notice 'FAIL  % orphaned point(s) left behind', n; end if;
  end $$;
rollback;
