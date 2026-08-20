-- LOCAL TEST ONLY. Stands in for what a real Supabase project already provides,
-- so the actual migrations can be executed and their policies exercised here.
-- Never applied to the hosted project.

create schema if not exists auth;
create schema if not exists storage;

do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then
    create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then
    create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then
    create role service_role nologin noinherit bypassrls; end if;
end $$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;

create table if not exists auth.users (
  id           uuid primary key default gen_random_uuid(),
  phone        text unique,
  /* UNIQUE, because it is unique in a real Supabase project and the stub has to
     agree with what it stands in for. Without the constraint, an `insert ... on
     conflict do nothing` in a test fixture quietly inserted a SECOND row with
     the same address on every run, and link_member.sql then picked whichever of
     the two came back first — a test that passed or failed depending on how many
     times the suite had been run before. */
  email        text unique,
  -- Present on current Supabase projects. The dev sign-in bypass and its
  -- removal script both key off it, so the stub has to carry it too.
  is_anonymous boolean not null default false
);

-- Byte-for-byte the same shape as Supabase's: read the subject out of the
-- request's JWT claims, which the tests below set with set_config.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  ), '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;

create or replace function storage.foldername(name text) returns text[]
language plpgsql immutable as $$
declare parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1 : array_length(parts, 1) - 1];
end $$;

-- ---------------------------------------------------------------------------
--  Test helpers, defined once here so 02/03/04 can all use them.
-- ---------------------------------------------------------------------------

-- Act as a signed-in user: switch to the `authenticated` role and set the JWT
-- claim that auth.uid() reads. Transaction-local, so it unwinds on rollback.
create or replace function test_as(p_uid text) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
end $$;

-- Act as the public.
create or replace function test_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
end $$;

-- Run a statement and report whether it was allowed, against what we expected.
-- A test that only checks "did this error" would pass when a statement is
-- refused for the wrong reason, so the message carries the SQLSTATE.
create or replace function expect(p_label text, p_sql text, p_should_work boolean)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    if p_should_work then raise notice 'PASS  %', p_label;
    else                  raise notice 'FAIL  %  (it was ALLOWED)', p_label;
    end if;
  exception
    when insufficient_privilege or check_violation or raise_exception then
      if p_should_work then raise notice 'FAIL  %  (blocked: %)', p_label, sqlerrm;
      else                  raise notice 'PASS  %', p_label;
      end if;
    when others then
      if p_should_work then raise notice 'FAIL  %  (%: %)', p_label, sqlstate, sqlerrm;
      else                  raise notice 'PASS  %  (%)', p_label, sqlstate;
      end if;
  end;
end $$;
