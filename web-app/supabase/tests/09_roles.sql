\pset format unaligned
\t on
set client_min_messages = notice;

\echo ''
\echo '=== three tiers: general member, leadership, committee ==='

-- Fixtures: member-a is general (can_contribute false), prakash-rasaili is
-- leadership (true, not admin), suresh-surkheti is committee (admin).

-- ---- a GENERAL member -----------------------------------------------------
begin;
  /* Point member-a's card at the third fixture account, so there is a general
     member to act as. Done BEFORE test_as, while still the table owner:
     user_id is not in the column grant for `authenticated` — deliberately, it
     is how a member would otherwise reassign their own card — so as that role
     this update is refused and takes the whole block down with it. */
  update public.members set user_id = '33333333-3333-3333-3333-333333333333'
   where slug = 'member-a';
  select test_as('33333333-3333-3333-3333-333333333333');

  do $$
  declare v_ok boolean;
  begin
    select public.can_contribute() into v_ok;
    if not v_ok then raise notice 'PASS  a general member is not a contributor';
    else raise notice 'FAIL  a general member counts as a contributor'; end if;
  end $$;

  -- What they CAN do: their own story.
  do $$ begin
    insert into public.stories (member_id, author_name, quote)
    values ((select id from public.members where user_id = auth.uid()),
            'Member A', 'A quote long enough to be a real submission from a member.');
    raise notice 'PASS  and can still submit a story';
  exception when others then
    raise notice 'FAIL  a general member cannot submit a story: %', sqlerrm;
  end $$;

  -- What they cannot.
  do $$ begin
    insert into public.meetings (held_on, title, submitted_by)
    values ('2026-08-09','Minutes by a general member',
            (select id from public.members where user_id = auth.uid()));
    raise notice 'FAIL  a general member filed meeting minutes';
  exception when others then
    raise notice 'PASS  but cannot file meeting minutes';
  end $$;

  do $$ begin
    insert into public.events (slug, title, event_date, is_published, submitted_by)
    values ('ga-event','By a general member','2026-12-01', false,
            (select id from public.members where user_id = auth.uid()));
    raise notice 'FAIL  a general member added an event';
  exception when others then
    raise notice 'PASS  nor add an event';
  end $$;
rollback;

-- ---- a LEADERSHIP member --------------------------------------------------
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$ begin perform public.link_member_to_current_user(); end $$;

  do $$
  declare v_admin boolean; v_contrib boolean;
  begin
    select public.is_admin(), public.can_contribute() into v_admin, v_contrib;
    if v_contrib and not v_admin then
      raise notice 'PASS  a leadership member contributes without being committee';
    else
      raise notice 'FAIL  contributor=% admin=%', v_contrib, v_admin;
    end if;
  end $$;

  do $$
  declare v_id uuid; v_pub boolean;
  begin
    insert into public.events (slug, title, event_date, is_published, submitted_by)
    values ('lead-event','Added by an officer','2026-12-01', false,
            (select id from public.members where user_id = auth.uid()))
    returning id, is_published into v_id, v_pub;
    insert into public.event_highlights (event_id, text, position)
    values (v_id, 'Bring a dish', 0);
    if not v_pub then raise notice 'PASS  can add an event, and it arrives unpublished';
    else raise notice 'FAIL  the event went straight live'; end if;
  end $$;

  -- The whole point of "add but not modify".
  do $$ begin
    update public.events set title = 'Renamed by an officer' where slug = 'lead-event';
    if (select title from public.events where slug='lead-event') = 'Renamed by an officer' then
      raise notice 'FAIL  a leadership member edited an event';
    else
      raise notice 'PASS  and cannot edit it afterwards (0 rows)';
    end if;
  exception when others then
    raise notice 'PASS  and cannot edit it afterwards';
  end $$;

  do $$
  declare n int;
  begin
    delete from public.events where slug = 'lead-event';
    select count(*) into n from public.events where slug = 'lead-event';
    if n = 1 then raise notice 'PASS  nor delete it';
    else raise notice 'FAIL  a leadership member deleted an event'; end if;
  exception when others then
    raise notice 'PASS  nor delete it';
  end $$;

  -- Publishing is the committee's act, and it is the one that matters: an
  -- officer who could set is_published would have full publish rights by
  -- another name.
  do $$ begin
    update public.events set is_published = true where slug = 'lead-event';
    if (select is_published from public.events where slug='lead-event') then
      raise notice 'FAIL  a leadership member published their own event';
    else
      raise notice 'PASS  nor publish it';
    end if;
  exception when others then
    raise notice 'PASS  nor publish it';
  end $$;

  -- Meeting minutes: yes, and still only as pending.
  do $$
  declare v_status text;
  begin
    insert into public.meetings (held_on, title, submitted_by)
    values ('2026-08-09','Minutes by an officer',
            (select id from public.members where user_id = auth.uid()));
    select status into v_status from public.meetings where title='Minutes by an officer';
    if v_status = 'pending' then raise notice 'PASS  can file meeting minutes, as pending';
    else raise notice 'FAIL  minutes landed as %', v_status; end if;
  end $$;

  -- And none of the committee's powers.
  do $$ begin
    perform public.admin_set_meeting_status(
      (select id from public.meetings where title='Minutes by an officer'), 'approved');
    raise notice 'FAIL  a leadership member approved their own minutes';
  exception when others then
    raise notice 'PASS  but cannot approve them';
  end $$;

  do $$ begin
    perform public.admin_set_contributor('aaaaaaaa-0000-0000-0000-000000000003', true);
    raise notice 'FAIL  a leadership member promoted somebody';
  exception when others then
    raise notice 'PASS  nor promote anybody else';
  end $$;

  -- Their own card, though, yes.
  do $$
  declare n int;
  begin
    update public.members set profession = 'Engineer' where user_id = auth.uid();
    select count(*) into n from public.members
     where user_id = auth.uid() and profession = 'Engineer';
    if n = 1 then raise notice 'PASS  and can still edit their own card';
    else raise notice 'FAIL  could not edit their own card'; end if;
  end $$;

  -- Self-promotion is the one to be sure about: can_contribute is not in the
  -- column grant, so this must fail at the grant rather than at a policy.
  do $$ begin
    update public.members set can_contribute = true, is_admin = true
     where user_id = auth.uid();
    raise notice 'FAIL  a member granted themselves committee access';
  exception when others then
    raise notice 'PASS  and cannot grant themselves anything';
  end $$;
rollback;

-- ---- the COMMITTEE --------------------------------------------------------
begin;
  select test_as('11111111-1111-1111-1111-111111111111');
  do $$ begin perform public.link_member_to_current_user(); end $$;

  do $$
  declare v_id uuid;
  begin
    insert into public.events (slug, title, event_date, is_published)
    values ('adm-event','Added by the committee','2026-12-02', true)
    returning id into v_id;
    update public.events set title = 'Renamed by the committee' where id = v_id;
    delete from public.events where id = v_id;
    raise notice 'PASS  the committee can add, publish, edit and delete';
  exception when others then
    raise notice 'FAIL  the committee could not: %', sqlerrm;
  end $$;

  do $$ begin
    perform public.admin_set_contributor('aaaaaaaa-0000-0000-0000-000000000003', true);
    if (select can_contribute from public.members
         where id='aaaaaaaa-0000-0000-0000-000000000003') then
      raise notice 'PASS  and can grant a general member contributor access';
    else
      raise notice 'FAIL  the grant did not land';
    end if;
  end $$;
rollback;

\echo ''
\echo '=== the gallery: leadership adds, the committee publishes ==='

begin;
  select test_as('22222222-2222-2222-2222-222222222222');   -- leadership, not admin
  do $$ begin perform public.link_member_to_current_user(); end $$;

  do $$
  declare v_pub boolean;
  begin
    insert into public.photos (storage_path, caption, category, is_published, submitted_by)
    values ('prakash-rasaili/1.jpg', 'Football last Sunday', 'sports', false,
            (select id from public.members where user_id = auth.uid()))
    returning is_published into v_pub;
    if not v_pub then raise notice 'PASS  a leadership member can add a photograph, unpublished';
    else raise notice 'FAIL  the photograph went straight into the gallery'; end if;
  end $$;

  -- The file, which is a separate barrier in a separate schema.
  do $$ begin
    insert into storage.objects (bucket_id, name) values ('site-photos','prakash-rasaili/1.jpg');
    raise notice 'PASS  and can upload the file into their own folder';
  exception when others then
    raise notice 'FAIL  the upload was refused: %', sqlerrm;
  end $$;

  -- Not over the committee's existing files at the root of the bucket.
  do $$ begin
    insert into storage.objects (bucket_id, name) values ('site-photos','tihar.jpg');
    raise notice 'FAIL  a contributor wrote to the root of the bucket';
  exception when others then
    raise notice 'PASS  but not to the root of the bucket, where the committee''s are';
  end $$;

  -- Nor into somebody else's folder.
  do $$ begin
    insert into storage.objects (bucket_id, name) values ('site-photos','suresh-surkheti/1.jpg');
    raise notice 'FAIL  a contributor wrote into another member''s folder';
  exception when others then
    raise notice 'PASS  nor into anybody else''s folder';
  end $$;

  do $$
  declare n int;
  begin
    update public.photos set is_published = true where storage_path = 'prakash-rasaili/1.jpg';
    select count(*) into n from public.photos
     where storage_path = 'prakash-rasaili/1.jpg' and is_published;
    if n = 0 then raise notice 'PASS  and cannot publish it themselves';
    else raise notice 'FAIL  a contributor published their own photograph'; end if;
  exception when others then
    raise notice 'PASS  and cannot publish it themselves';
  end $$;

  do $$
  declare n int;
  begin
    delete from public.photos where storage_path = 'prakash-rasaili/1.jpg';
    select count(*) into n from public.photos where storage_path = 'prakash-rasaili/1.jpg';
    if n = 1 then raise notice 'PASS  nor delete it';
    else raise notice 'FAIL  a contributor deleted their own photograph'; end if;
  exception when others then
    raise notice 'PASS  nor delete it';
  end $$;
rollback;

-- A general member is not let anywhere near either barrier.
begin;
  update public.members set user_id = '33333333-3333-3333-3333-333333333333'
   where slug = 'member-a';
  select test_as('33333333-3333-3333-3333-333333333333');
  do $$ begin
    insert into public.photos (storage_path, caption, is_published, submitted_by)
    values ('member-a/1.jpg','Nope', false,
            (select id from public.members where user_id = auth.uid()));
    raise notice 'FAIL  a general member added a photograph';
  exception when others then
    raise notice 'PASS  a general member cannot add a photograph';
  end $$;
  do $$ begin
    insert into storage.objects (bucket_id, name) values ('site-photos','member-a/1.jpg');
    raise notice 'FAIL  a general member uploaded a gallery file';
  exception when others then
    raise notice 'PASS  nor upload a gallery file';
  end $$;
rollback;

-- An unpublished photograph must not reach the public gallery.
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$ begin perform public.link_member_to_current_user(); end $$;
  insert into public.photos (storage_path, caption, is_published, submitted_by)
  values ('prakash-rasaili/2.jpg','Waiting', false,
          (select id from public.members where user_id = auth.uid()));
  select test_anon();
  do $$
  declare n int;
  begin
    select count(*) into n from public.photos where storage_path = 'prakash-rasaili/2.jpg';
    if n = 0 then raise notice 'PASS  and a visitor cannot see it until it is published';
    else raise notice 'FAIL  an unpublished photograph is public'; end if;
  end $$;
rollback;
