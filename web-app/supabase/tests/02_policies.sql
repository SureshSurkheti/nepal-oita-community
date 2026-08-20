\set QUIET on
\pset pager off
\pset format unaligned
\t on
set client_min_messages = notice;

-- expect_ok / expect_denied run a statement and report what happened.

\echo ''
\echo '=== 1. the public, not signed in ==='
begin;
  select test_anon();
  do $$
  declare n int;
  begin
    select count(*) into n from public.members;
    if n = 3 then raise notice 'PASS  the public is served all 3 published members';
    else raise notice 'FAIL  the public is served % members, expected 3', n; end if;
  exception when others then raise notice 'FAIL  public read of members blocked: %', sqlerrm;
  end $$;

  select expect('the public CANNOT read member_contacts at all',
    'select count(*) from public.member_contacts', false);
  select expect('the public cannot write a member row',
    'update public.members set profession = ''hacked''', false);
rollback;

\echo ''
\echo '=== 2. signed in, but not on the register ==='
begin;
  select test_as('33333333-3333-3333-3333-333333333333');
  do $$
  declare v uuid;
  begin
    v := public.link_member_to_current_user();
    if v is null then raise notice 'PASS  an unregistered number links to no member';
    else raise notice 'FAIL  it linked to %', v; end if;
  end $$;
  do $$
  declare n int;
  begin
    select count(*) into n from public.member_contacts;
    if n = 0 then raise notice 'PASS  and sees 0 contact rows (RLS, not a grant error)';
    else raise notice 'FAIL  it can see % contact rows', n; end if;
  end $$;
rollback;

\echo ''
\echo '=== 3. an ordinary member ==='
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$
  declare v uuid;
  begin
    v := public.link_member_to_current_user();
    if v = 'aaaaaaaa-0000-0000-0000-000000000002' then
      raise notice 'PASS  their number links them to their own card';
    else raise notice 'FAIL  linked to % instead', v; end if;
  end $$;
  do $$
  declare n int;
  begin
    select count(*) into n from public.member_contacts;
    if n = 4 then raise notice 'PASS  a linked member can read all 4 contact rows';
    else raise notice 'FAIL  a linked member read % contact rows, expected 4', n; end if;
  end $$;

  select expect('can set their OWN profession',
    'update public.members set profession=''Software engineer'' where user_id = auth.uid()', true);
  select expect('CANNOT change their own role',
    'update public.members set role=''President'' where user_id = auth.uid()', false);
  select expect('CANNOT make themselves an admin',
    'update public.members set is_admin = true where user_id = auth.uid()', false);
  select expect('CANNOT move themselves into the leadership team',
    'update public.members set category=''leadership'' where user_id = auth.uid()', false);
  select expect('CANNOT reassign their card to another account',
    'update public.members set user_id = ''11111111-1111-1111-1111-111111111111'' where user_id = auth.uid()', false);
  select expect('CANNOT change their own registered phone number',
    'update public.member_contacts set phone_e164=''+819000000000'' where member_id = ''aaaaaaaa-0000-0000-0000-000000000002''', false);
  select expect('can set their own Facebook link',
    'update public.member_contacts set facebook_url=''https://facebook.com/me'' where member_id = ''aaaaaaaa-0000-0000-0000-000000000002''', true);

  -- The one that matters most: somebody else's card.
  do $$
  declare n int;
  begin
    update public.members set profession='vandalised'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001';
    n := 0; get diagnostics n = row_count;
    if n = 0 then raise notice 'PASS  editing ANOTHER member''s card changes 0 rows';
    else raise notice 'FAIL  it changed % rows', n; end if;
  exception when insufficient_privilege then
    raise notice 'PASS  editing another member''s card is refused outright';
  end $$;

  select expect('cannot call an admin function',
    'select public.admin_set_admin(''aaaaaaaa-0000-0000-0000-000000000002'', true)', false);
rollback;

\echo ''
\echo '=== 4. story submissions ==='
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$ begin perform public.link_member_to_current_user(); end $$;
  select expect('a member may submit their own story',
    'insert into public.stories (member_id, author_name, quote)
       values (''aaaaaaaa-0000-0000-0000-000000000002'', ''Prakash'', ''It went well.'')', true);
  do $$
  declare s text;
  begin
    select status into s from public.stories order by created_at desc limit 1;
    if s = 'pending' then raise notice 'PASS  they can see their own submission, marked pending';
    elsif s is null then raise notice 'FAIL  their own submission is invisible to them';
    else raise notice 'FAIL  it landed as %', s; end if;
  end $$;
  select expect('CANNOT publish it themselves (no grant on status)',
    'insert into public.stories (member_id, author_name, quote, status)
       values (''aaaaaaaa-0000-0000-0000-000000000002'', ''P'', ''x'', ''approved'')', false);
  select expect('CANNOT submit in somebody else''s name',
    'insert into public.stories (member_id, author_name, quote)
       values (''aaaaaaaa-0000-0000-0000-000000000001'', ''Suresh'', ''x'')', false);
rollback;

\echo ''
\echo '=== 5. the committee ==='
begin;
  select test_as('11111111-1111-1111-1111-111111111111');
  do $$ begin perform public.link_member_to_current_user(); end $$;
  do $$ begin
    if public.is_admin() then raise notice 'PASS  the admin is recognised as one';
    else raise notice 'FAIL  is_admin() said false'; end if;
  end $$;
  select expect('an admin can add a member',
    'select public.admin_upsert_member(null, ''new-person'', ''New Person'', ''Member'', null, ''general'', 50, true)', true);
  select expect('an admin can set a member''s phone number',
    'select public.admin_set_member_contact(''aaaaaaaa-0000-0000-0000-000000000003'', ''+818055556666'', null, null, null)', true);
  select expect('an admin can approve a story',
    'select public.admin_set_story_status((select id from public.stories limit 1), ''approved'')', true);
  select expect('but CANNOT delete the last admin and lock everyone out',
    'select public.admin_delete_member(''aaaaaaaa-0000-0000-0000-000000000001'')', false);
  do $$
  declare v text;
  begin
    select initials into v from public.members where slug = 'new-person';
    if v = 'NP' then raise notice 'PASS  initials are derived for the avatar (NP)';
    else raise notice 'FAIL  initials came out as %', v; end if;
  end $$;
rollback;

\echo ''
\echo '=== 6. storage: photo folders ==='
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$ begin perform public.link_member_to_current_user(); end $$;
  select expect('a member may upload into their OWN folder',
    'insert into storage.objects (bucket_id, name) values (''member-photos'', ''prakash-rasaili/portrait.jpg'')', true);
  select expect('but NOT into another member''s folder',
    'insert into storage.objects (bucket_id, name) values (''member-photos'', ''suresh-surkheti/portrait.jpg'')', false);
  select expect('and not into the committee''s bucket',
    'insert into storage.objects (bucket_id, name) values (''site-photos'', ''gallery/x.jpg'')', false);
rollback;

\echo ''
\echo '=== 7. contact messages: anyone writes, only the committee reads ==='
begin;
  select test_anon();
  select expect('a visitor can send a message',
    'insert into public.messages (name, body) values (''A visitor'', ''Please tell me about joining.'')', true);
  select expect('but CANNOT read anybody''s messages back',
    'select count(*) from public.messages', false);
  select expect('and cannot file one as already dealt with',
    'insert into public.messages (name, body, handled) values (''X'', ''y'', true)', false);
  select expect('an empty message is refused',
    'insert into public.messages (name, body) values ('' '', '' '')', false);
rollback;

begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$ begin perform public.link_member_to_current_user(); end $$;
  do $$
  declare n int;
  begin
    select count(*) into n from public.messages;
    if n = 0 then raise notice 'PASS  an ordinary member sees no messages either';
    else raise notice 'FAIL  a member could read % messages', n; end if;
  end $$;
rollback;

begin;
  select test_as('11111111-1111-1111-1111-111111111111');
  do $$ begin perform public.link_member_to_current_user(); end $$;
  select expect('the committee can read them',
    'select count(*) from public.messages', true);
  select expect('and mark one as dealt with',
    'update public.messages set handled = true where true', true);
rollback;

\echo ''
\echo '=== 8. events, stories, photos: only the committee writes ==='
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$ begin perform public.link_member_to_current_user(); end $$;
  select expect('a member cannot add an event',
    'insert into public.events (slug, title, event_date) values (''x'',''X'',''2027-01-01'')', false);
  select expect('a member cannot edit the gallery',
    'insert into public.photos (storage_path) values (''x.jpg'')', false);
  select expect('a member cannot approve their own story',
    'update public.stories set status = ''approved'' where true', false);
rollback;

begin;
  select test_anon();
  select expect('and the public certainly cannot',
    'insert into public.events (slug, title, event_date) values (''y'',''Y'',''2027-01-01'')', false);
  do $$
  declare n int;
  begin
    select count(*) into n from public.events where is_published;
    raise notice 'PASS  though the public can read published events (%)' , n;
  end $$;
rollback;
