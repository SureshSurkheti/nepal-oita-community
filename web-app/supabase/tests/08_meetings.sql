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
    -- 0015: live on arrival. The review step was guarding against strangers
    -- filing minutes, and 0013 had already narrowed this to the leadership team.
    if v_status = 'approved' then
      raise notice 'PASS  a contributor can write up a meeting, and it is live at once';
    else
      raise notice 'FAIL  it landed as %', v_status;
    end if;
  end $$;

  /* The update grant is column-scoped and `status` is not in it. That is the one
     assertion that still matters after 0015: a contributor may rewrite every
     word of a write-up, but cannot touch the flag the committee uses to take one
     down — so a rejected write-up cannot be put back by the person who wrote it.
     Set to 'rejected' rather than 'approved' here, because approved is now the
     default and an UPDATE to the value a row already holds would pass even if
     the grant were wide open. */
  do $$
  declare v_id uuid;
  begin
    select id into v_id from public.meetings where title = 'August monthly meeting';
    update public.meetings set status = 'rejected' where id = v_id;
    raise notice 'FAIL  a contributor changed the status themselves';
  exception when others then
    raise notice 'PASS  but cannot touch status — the committee keeps that';
  end $$;

  -- What they CAN do, which is the point of 0015.
  do $$
  declare v_id uuid; v_title text; n int;
  begin
    select id into v_id from public.meetings where title = 'August monthly meeting';
    update public.meetings
       set title = 'August monthly meeting (corrected)', place = 'The community centre'
     where id = v_id;
    select title into v_title from public.meetings where id = v_id;
    if v_title = 'August monthly meeting (corrected)'
      then raise notice 'PASS  a contributor can correct a live write-up';
      else raise notice 'FAIL  the title is still %', v_title; end if;

    -- Editing the decisions is delete-then-insert; both halves need the grant.
    delete from public.meeting_points where meeting_id = v_id;
    insert into public.meeting_points (meeting_id, text, position) values
      (v_id, 'Annual fee stays at 3,000 yen', 0),
      (v_id, 'Dashain booking confirmed for 18 October', 1),
      (v_id, 'And one more that was missed the first time', 2);
    select count(*) into n from public.meeting_points where meeting_id = v_id;
    if n = 3 then raise notice 'PASS  and can replace its decisions, live';
    else raise notice 'FAIL  % point(s) after the rewrite', n; end if;
  end $$;

  do $$
  declare n int;
  begin
    select count(*) into n from public.meetings
     where title = 'August monthly meeting (corrected)';
    if n = 1 then raise notice 'PASS  and still sees it afterwards';
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

/* 0016: not for a visitor at all, whatever its status. `anon` has no SELECT
   grant on either table, so this is a hard refusal from Postgres before any
   policy runs — caught rather than counted, because a missing grant raises where
   a policy would merely have filtered. */
begin;
  select test_anon();
  do $$
  declare n int;
  begin
    select count(*) into n from public.meetings;
    raise notice 'FAIL  a visitor read % meeting(s)', n;
  exception when others then
    raise notice 'PASS  a visitor cannot read the minutes at all';
  end $$;
  do $$
  declare n int;
  begin
    select count(*) into n from public.meeting_points;
    raise notice 'FAIL  a visitor read % point(s)', n;
  exception when others then
    raise notice 'PASS  nor any of the decisions';
  end $$;
rollback;

/* A GENERAL member does read them — that is the other half of 0016. Asked for as
   "shown only after sign in by leadership or general both user", so the register
   is the line, not the leadership team.
   
   member-a is lent the third fixture account for the duration, the same way
   09_roles.sql does it, and for the same reason: the update has to happen as the
   table owner because members.user_id is not in the column grant. */
begin;
  update public.members set user_id = '33333333-3333-3333-3333-333333333333'
   where slug = 'member-a';
  select test_as('33333333-3333-3333-3333-333333333333');
  do $$
  declare n int; pts int; v_ok boolean;
  begin
    select public.can_contribute() into v_ok;
    select count(*) into n from public.meetings
     where title = 'August monthly meeting (corrected)';
    select count(*) into pts from public.meeting_points;
    if n = 1 and pts = 3 and not v_ok then
      raise notice 'PASS  a general member reads it, all three points, without contributing';
    else
      raise notice 'FAIL  general member sees % meeting(s), % point(s), contributor=%',
                   n, pts, v_ok;
    end if;
  end $$;
rollback;

-- And somebody with an account but no card on the register is not a member.
-- is_member() asks for the row, not merely for a session.
begin;
  select test_as('33333333-3333-3333-3333-333333333333');
  do $$
  declare n int;
  begin
    select count(*) into n from public.meetings;
    if n = 0 then raise notice 'PASS  a signed-in account with no card sees none';
    else raise notice 'FAIL  an account with no card read % meeting(s)', n; end if;
  end $$;
rollback;

\echo ''
\echo '=== the committee can still take it down ==='
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
    select id into v_id from public.meetings
     where title = 'August monthly meeting (corrected)';
    if v_id is null then
      raise notice 'FAIL  the committee cannot even see the write-up';
      return;
    end if;
    perform public.admin_set_meeting_status(v_id, 'rejected');
    select status into v_status from public.meetings where id = v_id;
    if v_status = 'rejected' then raise notice 'PASS  the committee can take it down';
    else raise notice 'FAIL  status is still %', v_status; end if;
  end $$;
commit;

-- Taken down, so not even a general member has it any more. The read policy is
-- `is_member() AND (status = 'approved' OR is_admin())` — being on the register
-- is necessary, not sufficient.
begin;
  update public.members set user_id = '33333333-3333-3333-3333-333333333333'
   where slug = 'member-a';
  select test_as('33333333-3333-3333-3333-333333333333');
  do $$
  declare n int; pts int;
  begin
    select count(*) into n from public.meetings;
    select count(*) into pts from public.meeting_points;
    if n = 0 and pts = 0 then
      raise notice 'PASS  and then a general member sees nothing either';
    else raise notice 'FAIL  general member still sees % meeting(s), % point(s)', n, pts; end if;
  end $$;
rollback;

-- The team that wrote it keeps seeing it, and may still correct it — but cannot
-- undo the committee's decision to pull it. That asymmetry is the whole of what
-- the committee retains over this section.
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$
  declare n int;
  begin
    select count(*) into n from public.meetings
     where title = 'August monthly meeting (corrected)';
    if n = 1 then raise notice 'PASS  a contributor still sees a taken-down write-up';
    else raise notice 'FAIL  it vanished from the team that wrote it'; end if;
  end $$;
  do $$
  declare v_id uuid;
  begin
    select id into v_id from public.meetings
     where title = 'August monthly meeting (corrected)';
    update public.meetings set status = 'approved' where id = v_id;
    raise notice 'FAIL  a contributor put a taken-down write-up back up';
  exception when others then
    raise notice 'PASS  but cannot put it back up';
  end $$;
rollback;

/* Somebody who is NOT a contributor. The third fixture account is on no member
   row at all here — 09_roles.sql is the file that lends it member-a's card, and
   it rolls that back — so can_contribute() is false for the plainest possible
   reason. Both doors are tested, because 0015 opened a direct DELETE for
   contributors and that is a different check from the committee's RPC. */
begin;
  select test_as('33333333-3333-3333-3333-333333333333');
  do $$
  declare v_id uuid;
  begin
    select id into v_id from public.meetings limit 1;
    perform public.admin_delete_meeting(v_id);
    raise notice 'FAIL  a non-contributor called the committee delete RPC';
  exception when others then
    raise notice 'PASS  a non-contributor cannot call admin_delete_meeting';
  end $$;
rollback;

begin;
  /* Seeded as the owner, live, so there is something visible to be refused. The
     write-up from the blocks above has been taken down by this point, and a
     DELETE that matches nothing succeeds quietly — so without this row the
     assertion below would have passed with no policy at all. */
  insert into public.meetings (held_on, title, status, submitted_by)
  values ('2026-05-10','A live write-up','approved',
          'aaaaaaaa-0000-0000-0000-000000000002');
  select test_as('33333333-3333-3333-3333-333333333333');
  do $$
  declare n int;
  begin
    delete from public.meetings;
    /* GET DIAGNOSTICS, not a re-read. The DELETE grant is to `authenticated` and
       the policy is what filters it, so nothing is raised and the rows affected
       is the only honest measure — and since 0016 this role cannot SELECT the
       table either, so counting what is left would report zero whether the
       delete worked or not. It did, for one run: the first version of this block
       "passed" by being unable to see its own evidence. */
    get diagnostics n = row_count;
    if n = 0 then raise notice 'PASS  nor delete one directly (0 rows affected)';
    else raise notice 'FAIL  a non-contributor deleted % row(s)', n; end if;
  exception when others then
    raise notice 'PASS  nor delete one directly (refused: %)', sqlerrm;
  end $$;
rollback;

-- The contributor's own delete, which 0015 granted. Last, because it empties the
-- table the blocks above read from.
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$
  declare v_id uuid; n int; pts int;
  begin
    select id into v_id from public.meetings
     where title = 'August monthly meeting (corrected)';
    delete from public.meetings where id = v_id;
    select count(*) into n from public.meetings where id = v_id;
    select count(*) into pts from public.meeting_points where meeting_id = v_id;
    if n = 0 and pts = 0 then
      raise notice 'PASS  a contributor can delete one, points and all';
    else raise notice 'FAIL  % row(s) and % point(s) left', n, pts; end if;
  end $$;
rollback;

begin;
  select test_as('11111111-1111-1111-1111-111111111111');
  do $$ begin perform public.link_member_to_current_user(); end $$;
  /* The title here has to be the corrected one. It was the original for a while
     after 0015 renamed the row two blocks up, which meant v_id came back null,
     admin_delete_meeting matched nothing, the point count for a null meeting_id
     was zero and the assertion passed without deleting anything. Guarded on
     v_id, and the meeting row itself is counted as well as its points. */
  do $$
  declare v_id uuid; n int; pts int;
  begin
    select id into v_id from public.meetings
     where title = 'August monthly meeting (corrected)';
    if v_id is null then
      raise notice 'FAIL  the committee cannot see the write-up to delete it';
      return;
    end if;
    perform public.admin_delete_meeting(v_id);
    select count(*) into n   from public.meetings       where id = v_id;
    select count(*) into pts from public.meeting_points where meeting_id = v_id;
    if n = 0 and pts = 0 then
      raise notice 'PASS  the committee can delete one, points and all';
    else raise notice 'FAIL  % row(s) and % orphaned point(s) left behind', n, pts; end if;
  end $$;
rollback;
