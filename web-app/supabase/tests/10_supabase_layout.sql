\pset format unaligned
\t on
set client_min_messages = notice;

-- ===========================================================================
--  The bug this file exists for
--
--  Claim codes were hashed with pgcrypto's digest() and generated with its
--  gen_random_bytes(). On a local PostgreSQL, `create extension pgcrypto` with
--  no schema puts both in `public`, so every test in 07_claim_codes.sql passed.
--  On Supabase, pgcrypto is ALREADY installed — in `extensions` — so that line
--  is a no-op and the functions stay where they are. The claim-code functions
--  are `security definer set search_path = public`, which does not include
--  `extensions`, so digest() was unresolvable and sign-in failed for everybody
--  with `function digest(text, unknown) does not exist`.
--
--  Nothing in the suite could catch it, because the suite's own database had
--  pgcrypto in the one schema where it happened to work. So this file moves
--  pgcrypto to where Supabase keeps it and runs the same paths again.
--
--  Every block is wrapped in begin/rollback, so the relocation is undone and the
--  other test files see the database they expect.
-- ===========================================================================

-- Defined here as well as in 07 so this file stands on its own: it is the one
-- that would be reached for after a production failure, and needing to run
-- another file first is exactly the friction that stops that happening.
create or replace function t_be(p_uid text) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
  perform public.link_member_to_current_user();
end $$;

-- Two accounts that own nothing, as 07 makes. Repeated for the same reason.
insert into auth.users (id, email) values
  ('c1111111-0000-0000-0000-000000000001', 'newcomer@example.com'),
  ('c1111111-0000-0000-0000-000000000002', 'stranger@example.com')
on conflict do nothing;

\echo ''
\echo '=== with pgcrypto where Supabase keeps it (schema `extensions`) ==='

-- First, prove the relocation actually reproduces the failure. If this block
-- ever stops reporting "unreachable", the premise of the file is wrong and the
-- tests below have stopped testing anything.
--
-- The two probes are SECURITY DEFINER with the same pinned search_path the real
-- claim-code functions use, which is the whole mechanism of the bug. They are
-- declared out here rather than inside a DO block, because `create function` is
-- not a plpgsql statement — an earlier version of this file put them inside one
-- and psql reported a syntax error that run.sh's PASS/FAIL grep threw away, so
-- the block printed nothing at all and looked like it had been skipped.
begin;
  create schema if not exists extensions;
  alter extension pgcrypto set schema extensions;

  create or replace function t_reach_pgcrypto() returns boolean
  language plpgsql security definer set search_path = public as $fn$
  begin
    perform digest('x', 'sha256');
    return true;
  exception when undefined_function then
    return false;
  end $fn$;

  create or replace function t_reach_core() returns boolean
  language plpgsql security definer set search_path = public as $fn$
  begin
    perform sha256(convert_to('x', 'UTF8'));
    perform gen_random_uuid();
    return true;
  exception when undefined_function then
    return false;
  end $fn$;

  do $$
  begin
    if t_reach_pgcrypto() then
      raise notice 'FAIL  digest() is still reachable — the relocation did not reproduce Supabase';
    else
      raise notice 'PASS  digest() is unreachable from search_path=public, exactly as on Supabase';
    end if;

    if t_reach_core() then
      raise notice 'PASS  sha256() and gen_random_uuid() are reachable — they live in pg_catalog';
    else
      raise notice 'FAIL  the replacements are not reachable either';
    end if;
  end $$;
rollback;

-- ---------------------------------------------------------------------------
--  The path that was broken in production: issue, then redeem.
-- ---------------------------------------------------------------------------
begin;
  create schema if not exists extensions;
  alter extension pgcrypto set schema extensions;

  do $$
  declare v_code text; v_member uuid;
  begin
    perform t_be('11111111-1111-1111-1111-111111111111');            -- the admin

    begin
      v_code := public.admin_issue_claim_code('aaaaaaaa-0000-0000-0000-000000000003');
      if v_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$' then
        raise notice 'PASS  the committee can issue a code with pgcrypto out of reach';
      else
        raise notice 'FAIL  malformed code: %', v_code;
      end if;
    exception when others then
      raise notice 'FAIL  issuing a code raised: %', sqlerrm;
      return;
    end;

    perform set_config('request.jwt.claims',
      json_build_object('sub','c1111111-0000-0000-0000-000000000001')::text, true);

    begin
      v_member := public.claim_member_with_code(v_code);
      if v_member = 'aaaaaaaa-0000-0000-0000-000000000003' then
        raise notice 'PASS  and a member can redeem it — this is the sign-in that was failing';
      else
        raise notice 'FAIL  redeeming returned %', v_member;
      end if;
    exception when others then
      raise notice 'FAIL  redeeming raised: %', sqlerrm;
    end;
  end $$;
rollback;

-- Normalisation still has to survive the change of hash, or a code read down a
-- phone stops matching the one that was issued.
begin;
  create schema if not exists extensions;
  alter extension pgcrypto set schema extensions;

  do $$
  declare v_code text; v_member uuid;
  begin
    perform t_be('11111111-1111-1111-1111-111111111111');
    -- draft-person, and it has to be a card nobody holds. …0002 is linked by the
    -- time this file runs: 09_roles.sql calls link_member_to_current_user()
    -- outside a transaction, so that link survives into this database. Using it
    -- here made the redemption fail with "that card already belongs to an
    -- account", which is a true answer to the wrong question.
    v_code := public.admin_issue_claim_code('aaaaaaaa-0000-0000-0000-000000000004');
    perform set_config('request.jwt.claims',
      json_build_object('sub','c1111111-0000-0000-0000-000000000002')::text, true);
    v_member := public.claim_member_with_code('  ' || lower(replace(v_code, '-', ' ')) || ' ');
    if v_member = 'aaaaaaaa-0000-0000-0000-000000000004' then
      raise notice 'PASS  lower case, spaces and missing dashes still match';
    else
      raise notice 'FAIL  normalisation lost it';
    end if;
  exception when others then
    raise notice 'FAIL  normalised redemption raised: %', sqlerrm;
  end $$;
rollback;

-- The new hash must agree byte for byte with the old one, or any code issued
-- before this migration stops working the moment it runs.
begin;
  do $$
  begin
    if sha256(convert_to('ABCDEFGHJK', 'UTF8')) = digest('ABCDEFGHJK', 'sha256') then
      raise notice 'PASS  sha256(convert_to(...)) equals digest(...,''sha256'') — codes issued earlier still match';
    else
      raise notice 'FAIL  the two hashes differ: outstanding codes would be invalidated';
    end if;
  end $$;
rollback;

-- Fifty bits, and every character drawn from the whole alphabet. Bytes 6 and 8
-- of a v4 UUID carry the version and variant bits, so a generator that used them
-- would quietly restrict one character to the first half of the alphabet.
begin;
  do $$
  declare
    v_all   text := '';
    v_codes text[] := '{}';
    i       int;
    c       text;
  begin
    for i in 1 .. 400 loop
      c := public.generate_claim_code();
      v_all   := v_all || replace(c, '-', '');
      v_codes := v_codes || c;
    end loop;

    -- Every one of the 32 letters should turn up somewhere in 4000 characters.
    if (select count(*) from (
          select ch from regexp_split_to_table('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', '') ch
           where position(ch in v_all) = 0) x) = 0 then
      raise notice 'PASS  all 32 alphabet characters appear — no position is biased';
    else
      raise notice 'FAIL  some characters never appear: %', (
        select string_agg(ch, '') from (
          select ch from regexp_split_to_table('ABCDEFGHJKLMNPQRSTUVWXYZ23456789','') ch
           where position(ch in v_all) = 0) y);
    end if;

    if (select count(distinct u) from unnest(v_codes) u) = 400 then
      raise notice 'PASS  400 codes, 400 distinct values';
    else
      raise notice 'FAIL  generate_claim_code() repeated itself in 400 draws';
    end if;

    if v_all !~ '[IO01]' then
      raise notice 'PASS  and still no I, O, 0 or 1 anywhere';
    else
      raise notice 'FAIL  an ambiguous character got into the alphabet';
    end if;
  end $$;
rollback;

\echo ''
\echo '=== the committee filling in another member''s card ==='

-- The admin sets a portrait and a profession on a card that is not theirs.
begin;
  do $$
  declare v_photo text; v_prof text;
  begin
    perform t_be('11111111-1111-1111-1111-111111111111');
    perform public.admin_set_member_profile(
      'aaaaaaaa-0000-0000-0000-000000000003',
      'member-a/1700000000.jpg', 'Care worker', 'https://facebook.com/mema', null, null);

    perform set_config('role', 'postgres', true);
    select photo_path, profession into v_photo, v_prof
      from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000003';

    if v_photo = 'member-a/1700000000.jpg' and v_prof = 'Care worker' then
      raise notice 'PASS  the committee can set a photo and profession on another card';
    else
      raise notice 'FAIL  wrote photo=% profession=%', v_photo, v_prof;
    end if;
  end $$;
rollback;

-- NULL leaves a field alone. Without this, saving a changed profession wipes the
-- portrait, which is the one mistake this function must not make.
begin;
  do $$
  declare v_photo text; v_prof text;
  begin
    perform t_be('11111111-1111-1111-1111-111111111111');
    perform public.admin_set_member_profile(
      'aaaaaaaa-0000-0000-0000-000000000003', 'member-a/keep.jpg', 'First', null, null, null);
    perform public.admin_set_member_profile(
      'aaaaaaaa-0000-0000-0000-000000000003', null, 'Second', null, null, null);

    perform set_config('role', 'postgres', true);
    select photo_path, profession into v_photo, v_prof
      from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000003';

    if v_photo = 'member-a/keep.jpg' and v_prof = 'Second' then
      raise notice 'PASS  null leaves a field alone — changing the profession keeps the photo';
    else
      raise notice 'FAIL  photo=% profession=%', v_photo, v_prof;
    end if;
  end $$;
rollback;

-- An empty string clears it, which is how the photo comes off a card.
begin;
  do $$
  declare v_photo text;
  begin
    perform t_be('11111111-1111-1111-1111-111111111111');
    perform public.admin_set_member_profile(
      'aaaaaaaa-0000-0000-0000-000000000003', 'member-a/gone.jpg', null, null, null, null);
    perform public.admin_set_member_profile(
      'aaaaaaaa-0000-0000-0000-000000000003', '', null, null, null, null);

    perform set_config('role', 'postgres', true);
    select photo_path into v_photo
      from public.members where id = 'aaaaaaaa-0000-0000-0000-000000000003';

    if v_photo is null then
      raise notice 'PASS  an empty string clears it';
    else
      raise notice 'FAIL  clearing left photo_path = %', v_photo;
    end if;
  end $$;
rollback;

-- A member must not be able to write anybody else's card through this door.
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$ begin
    perform public.link_member_to_current_user();
    perform public.admin_set_member_profile(
      'aaaaaaaa-0000-0000-0000-000000000003', 'member-a/hijack.jpg', 'Boss', null, null, null);
    raise notice 'FAIL  an ordinary member rewrote another member''s card';
  exception when others then
    raise notice 'PASS  an ordinary member cannot use it';
  end $$;
rollback;

-- A member id that does not exist has to raise rather than report success. RLS
-- and a missing row both come back as zero rows, not as an error.
begin;
  do $$ begin
    perform t_be('11111111-1111-1111-1111-111111111111');
    perform public.admin_set_member_profile(
      'aaaaaaaa-0000-0000-0000-00000000ffff', 'nobody/x.jpg', null, null, null, null);
    raise notice 'FAIL  writing a card that does not exist reported success';
  exception when others then
    raise notice 'PASS  a member id that does not exist is refused';
  end $$;
rollback;

\echo ''
\echo '=== the member-photos bucket ==='

-- The admin can now write into any member's folder.
begin;
  select test_as('11111111-1111-1111-1111-111111111111');
  do $$
  declare n int;
  begin
    perform public.link_member_to_current_user();
    insert into storage.objects (bucket_id, name)
    values ('member-photos', 'member-a/from-the-committee.jpg');
    select count(*) into n from storage.objects
     where name = 'member-a/from-the-committee.jpg';
    if n = 1 then
      raise notice 'PASS  the committee can upload into another member''s folder';
    else
      raise notice 'FAIL  the upload did not land';
    end if;
  exception when others then
    raise notice 'FAIL  the committee upload was refused: %', sqlerrm;
  end $$;
rollback;

-- And an ordinary member still cannot, which is the policy 0003 set and 0019
-- must not have widened.
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$ begin
    perform public.link_member_to_current_user();
    insert into storage.objects (bucket_id, name)
    values ('member-photos', 'member-a/stolen.jpg');
    raise notice 'FAIL  a member uploaded into somebody else''s folder';
  exception when others then
    raise notice 'PASS  a member still cannot upload into somebody else''s folder';
  end $$;
rollback;

-- Their own folder, though, still works.
begin;
  select test_as('22222222-2222-2222-2222-222222222222');
  do $$
  declare n int;
  begin
    perform public.link_member_to_current_user();
    insert into storage.objects (bucket_id, name)
    values ('member-photos', 'prakash-rasaili/mine.jpg');
    select count(*) into n from storage.objects where name = 'prakash-rasaili/mine.jpg';
    if n = 1 then raise notice 'PASS  and a member can still upload into their own';
    else raise notice 'FAIL  a member lost access to their own folder'; end if;
  exception when others then
    raise notice 'FAIL  a member can no longer upload their own photo: %', sqlerrm;
  end $$;
rollback;
