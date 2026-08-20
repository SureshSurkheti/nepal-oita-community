\pset format unaligned
\t on
set client_min_messages = notice;

\echo ''
\echo '=== membership claim codes ==='

-- Two accounts that own nothing: exactly what somebody has after signing up with
-- an email address and a password.
insert into auth.users (id, email) values
  ('c1111111-0000-0000-0000-000000000001', 'newcomer@example.com'),
  ('c1111111-0000-0000-0000-000000000002', 'stranger@example.com')
on conflict do nothing;

/* Everything below happens inside a single DO block per scenario, with the code
   held in a local variable and the identity switched by set_config.
   
   The first version of this passed codes between scenarios through a temporary
   table, which test_as cannot touch: it switches the role to `authenticated`,
   and a temp table created by postgres is not readable by it. Every assertion
   that needed the code silently vanished into an aborted transaction. */

-- Helper: become somebody, including the link that makes is_admin() true.
create or replace function t_be(p_uid text) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
  perform public.link_member_to_current_user();
end $$;

begin;
  do $$
  declare v_code text; n int;
  begin
    perform t_be('11111111-1111-1111-1111-111111111111');            -- the admin
    v_code := public.admin_issue_claim_code('aaaaaaaa-0000-0000-0000-000000000003');

    if v_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$' then
      raise notice 'PASS  the committee gets a readable code (%)', v_code;
    else
      raise notice 'FAIL  malformed code: %', v_code;
    end if;

    -- No I, O, 0 or 1 anywhere in the alphabet: somebody has to read these out
    -- loud, and "oh or zero" is a support request nobody should have to answer.
    if v_code !~ '[IO01]' then
      raise notice 'PASS  and it contains no ambiguous characters';
    else
      raise notice 'FAIL  code contains I, O, 0 or 1: %', v_code;
    end if;
  end $$;
rollback;

-- The plaintext is not recoverable from what is stored. Checked as the table
-- owner, because that is the strongest version of the claim: not "a member
-- cannot read it" but "it is not there".
begin;
  do $$
  declare v_code text; n int;
  begin
    perform t_be('11111111-1111-1111-1111-111111111111');
    v_code := public.admin_issue_claim_code('aaaaaaaa-0000-0000-0000-000000000003');
    perform set_config('role', 'postgres', true);
    select count(*) into n from public.member_claim_codes
     where encode(code_sha256, 'hex') like '%' || lower(replace(v_code, '-', '')) || '%'
        or convert_from(code_sha256, 'LATIN1') like '%' || v_code || '%';
    if n = 0 then raise notice 'PASS  and the code itself is not stored anywhere';
    else raise notice 'FAIL  the plaintext is recoverable from the table'; end if;
  exception when others then
    -- convert_from can fail on arbitrary bytes; the hex check alone is enough.
    select count(*) into n from public.member_claim_codes
     where encode(code_sha256, 'hex') like '%' || lower(replace(v_code, '-', '')) || '%';
    if n = 0 then raise notice 'PASS  and the code itself is not stored anywhere';
    else raise notice 'FAIL  the plaintext is recoverable from the table'; end if;
  end $$;
rollback;

-- An ordinary member must not be able to mint codes for other people's cards.
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$ begin
    perform public.link_member_to_current_user();
    perform public.admin_issue_claim_code('aaaaaaaa-0000-0000-0000-000000000003');
    raise notice 'FAIL  a member issued a claim code';
  exception when others then
    raise notice 'PASS  a member cannot issue a claim code';
  end $$;
rollback;

-- Nor read the table directly, hash or no hash: which cards have an outstanding
-- code is the committee's business.
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  select expect('nor read the code table at all',
    'select count(*) from public.member_claim_codes', false);
rollback;

\echo ''
\echo '=== redeeming one ==='

begin;
  do $$
  declare v_code text; v_member uuid; c int;
  begin
    perform t_be('11111111-1111-1111-1111-111111111111');
    v_code := public.admin_issue_claim_code('aaaaaaaa-0000-0000-0000-000000000003');

    perform set_config('request.jwt.claims',
      json_build_object('sub','c1111111-0000-0000-0000-000000000001')::text, true);

    select count(*) into c from public.member_contacts;
    if c = 0 then raise notice 'PASS  a fresh account starts with no contact access';
    else raise notice 'FAIL  a fresh account already reads % contacts', c; end if;

    v_member := public.claim_member_with_code(v_code);
    select count(*) into c from public.member_contacts;
    if v_member = 'aaaaaaaa-0000-0000-0000-000000000003' and c = 4 then
      raise notice 'PASS  the code links the card and opens the directory';
    else
      raise notice 'FAIL  claimed % and sees % contacts', v_member, c;
    end if;
  end $$;
rollback;

/* A spent code must be dead. Isolating that is fiddly: redeeming a code also
   links the card, so a second attempt hits the "that card already belongs to an
   account" branch instead and the used-code branch never runs.
   
   Reissuing is the way in. It retires the previous code WITHOUT linking anybody,
   which leaves exactly the state under test: a code that exists, has been
   spent, and whose member is still unclaimed. */
begin;
  do $$
  declare v_first text; v_second text; v_member uuid;
  begin
    perform t_be('11111111-1111-1111-1111-111111111111');
    v_first  := public.admin_issue_claim_code('aaaaaaaa-0000-0000-0000-000000000004');
    v_second := public.admin_issue_claim_code('aaaaaaaa-0000-0000-0000-000000000004');

    perform set_config('request.jwt.claims',
      json_build_object('sub','c1111111-0000-0000-0000-000000000002')::text, true);
    begin
      perform public.claim_member_with_code(v_first);
      raise notice 'FAIL  a retired code still worked';
    exception when others then
      raise notice 'PASS  reissuing kills the previous code';
    end;

    v_member := public.claim_member_with_code(v_second);
    if v_member = 'aaaaaaaa-0000-0000-0000-000000000004' then
      raise notice 'PASS  and the new one works';
    else
      raise notice 'FAIL  the new code did not work either';
    end if;
  end $$;
rollback;

-- Somebody else's card, already claimed, is not available.
begin;
  do $$
  declare v_code text;
  begin
    perform t_be('11111111-1111-1111-1111-111111111111');
    v_code := public.admin_issue_claim_code('aaaaaaaa-0000-0000-0000-000000000003');
    update public.members set user_id = 'c1111111-0000-0000-0000-000000000001'
     where id = 'aaaaaaaa-0000-0000-0000-000000000003';

    perform set_config('request.jwt.claims',
      json_build_object('sub','c1111111-0000-0000-0000-000000000002')::text, true);
    perform public.claim_member_with_code(v_code);
    raise notice 'FAIL  a claimed card was taken with a leaked code';
  exception when others then
    raise notice 'PASS  a card already linked to an account cannot be taken';
  end $$;
rollback;

begin;
  select test_as('c1111111-0000-0000-0000-000000000002');
  do $$ begin
    perform public.claim_member_with_code('AAAAA-AAAAA');
    raise notice 'FAIL  an invented code was accepted';
  exception when others then
    raise notice 'PASS  an invented code is refused';
  end $$;
rollback;

-- Case, spaces and missing dashes are all thrown away, so a code read down a
-- phone and typed back in still works.
begin;
  do $$
  declare v_code text; v_member uuid;
  begin
    perform t_be('11111111-1111-1111-1111-111111111111');
    v_code := public.admin_issue_claim_code('aaaaaaaa-0000-0000-0000-000000000002');
    perform set_config('request.jwt.claims',
      json_build_object('sub','c1111111-0000-0000-0000-000000000002')::text, true);
    v_member := public.claim_member_with_code('  ' || lower(replace(v_code, '-', ' ')) || ' ');
    if v_member = 'aaaaaaaa-0000-0000-0000-000000000002' then
      raise notice 'PASS  lower case, spaces and missing dashes all still match';
    else
      raise notice 'FAIL  normalisation lost it';
    end if;
  end $$;
rollback;

-- No session: reachable, because the sign-in screen asks for the code on the
-- same page it asks for the password.
begin;
  select test_anon();
  do $$ begin
    perform public.claim_member_with_code('ABCDE-FGHJK');
    raise notice 'FAIL  it ran with no session';
  exception when others then
    raise notice 'PASS  with no session it asks you to sign in first';
  end $$;
rollback;
