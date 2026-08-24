-- ===========================================================================
--  0019 — Why nobody could sign in, and letting the committee fill a card in
--
--  TWO SEPARATE THINGS, and the first one is a live outage.
--
--  ------------------------------------------------------------------ PART 1
--  THE SIGN-IN BUG: `function digest(text, unknown) does not exist`
--
--  Every attempt to redeem a membership code died with that message, and every
--  attempt to ISSUE one died the same way one function earlier. So the second
--  half of sign-in has never worked on this project — not for one member, not
--  once. It looked like a form that was broken rather than a database that was
--  misconfigured, which is why it went unnoticed.
--
--  The cause. 0011 hashes claim codes with `digest(..., 'sha256')` and generates
--  them with `gen_random_bytes(10)`. Both belong to pgcrypto. 0001 asks for the
--  extension with
--
--      create extension if not exists "pgcrypto";
--
--  and on Supabase that line is a no-op, because pgcrypto is ALREADY installed —
--  into the `extensions` schema, not `public`. `if not exists` means it is not
--  moved. Meanwhile both claim-code functions are declared
--
--      security definer set search_path = public
--
--  which pins the search path to a schema pgcrypto is not in. `digest` is
--  therefore unresolvable inside the function body even though the extension is
--  present and working elsewhere in the database. Pinning search_path on a
--  SECURITY DEFINER function is correct and must stay — it is what stops a
--  caller shadowing `members` with their own table — so the fix is to stop
--  needing pgcrypto at all.
--
--  Which is easy, because core Postgres has both:
--
--      digest(t, 'sha256')   ->  sha256(convert_to(t, 'UTF8'))    -- PG 11+
--      gen_random_bytes(10)  ->  bytes of gen_random_uuid()       -- PG 13+
--
--  Both live in `pg_catalog`, which is on every search path implicitly and
--  cannot be removed from one. So this cannot break again the next time Supabase
--  moves an extension around.
--
--  `sha256(convert_to(t,'UTF8'))` returns BYTE-FOR-BYTE what
--  `digest(t,'sha256')` returned: digest casts text to bytea in the server
--  encoding, which is UTF8, and hashes that. So any code already in the table
--  still matches after this runs. (There are none — issuing was broken too —
--  but the property is what makes this a safe drop-in rather than a migration
--  that silently invalidates outstanding codes.)
--
--  ------------------------------------------------------------------ PART 2
--  THE COMMITTEE CAN NOW FILL IN SOMEBODY ELSE'S CARD
--
--  Until now a photograph, a profession and the social links could only be set
--  by the member themselves, from /me. That is the right default and it stays.
--  But it left the committee unable to finish a card for somebody who has not
--  claimed an account yet, or who sent their photo in a WhatsApp message and is
--  never going to log in and upload it — which is most of the register.
-- ===========================================================================


-- ===========================================================================
--  PART 1 — the sign-in fix
-- ===========================================================================

/* Both replacements are core, but "core" means a version. sha256() arrived in
   PostgreSQL 11 and gen_random_uuid() in 13; every Supabase project is well past
   both. Checked anyway, because the alternative to a sentence saying which
   version is needed is the same undefined_function error this migration exists to
   remove, one function further along. */
do $$
begin
  if to_regprocedure('pg_catalog.sha256(bytea)') is null
     or to_regprocedure('pg_catalog.gen_random_uuid()') is null then
    raise exception
      'This migration needs PostgreSQL 13 or later (sha256 arrived in 11, '
      'gen_random_uuid in 13). This server is: %', current_setting('server_version');
  end if;
end $$;

-- ---------------------------------------------------------------------------
--  Generating a code, without pgcrypto
--
--  Ten characters from a thirty-two letter alphabet: fifty bits, unchanged.
--  The randomness now comes from a v4 UUID's bytes instead of
--  gen_random_bytes.
--
--  Bytes 6 and 8 of a v4 UUID are deliberately NOT used. Byte 6 carries the
--  version nibble (always 0x4_) and byte 8 the variant bits, so `% 32` on
--  either is biased — byte 6 could only ever produce the first sixteen letters
--  of the alphabet. Using the twelve fully random bytes and taking ten of them
--  keeps every character uniform, which is the property the comment in 0011
--  claims and the reason 256 being a multiple of 32 mattered in the first place.
-- ---------------------------------------------------------------------------
create or replace function public.generate_claim_code()
returns text language plpgsql volatile as $$
declare
  alphabet constant text  := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  -- Byte offsets of a v4 UUID that hold no fixed bits. 6 and 8 are absent.
  picks    constant int[] := array[0,1,2,3,4,5,7,9,10,11];
  bytes    bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  out      text  := '';
  i        int;
begin
  for i in 1 .. 10 loop
    -- 256 is a whole multiple of 32, so the modulo is unbiased.
    out := out || substr(alphabet, 1 + (get_byte(bytes, picks[i]) % 32), 1);
  end loop;
  -- I, O, 0 and 1 are not in the alphabet: somebody will read one of these down
  -- a phone, and "is that an oh or a zero" is a support request the committee
  -- should never have to answer.
  return substr(out, 1, 5) || '-' || substr(out, 6, 5);
end $$;

-- ---------------------------------------------------------------------------
--  Issuing one
--
--  Identical to 0011 apart from the hash call. Repeated in full rather than
--  patched, because `create or replace function` has no way to change one line.
-- ---------------------------------------------------------------------------
create or replace function public.admin_issue_claim_code(p_member_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  if not exists (select 1 from public.members where id = p_member_id) then
    raise exception 'no such member';
  end if;

  -- Any code issued to this member earlier is spent, whether or not it was
  -- used. Two live codes for one card means one of them is a spare key nobody
  -- is keeping track of.
  update public.member_claim_codes
     set used_at = coalesce(used_at, now())
   where member_id = p_member_id and used_at is null;

  v_code := public.generate_claim_code();
  insert into public.member_claim_codes (member_id, code_sha256)
  values (p_member_id,
          sha256(convert_to(public.normalise_claim_code(v_code), 'UTF8')));

  -- Returned once and never again: only the hash is stored.
  return v_code;
end $$;

-- ---------------------------------------------------------------------------
--  Redeeming one
-- ---------------------------------------------------------------------------
create or replace function public.claim_member_with_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid    uuid := auth.uid();
  v_norm   text := public.normalise_claim_code(p_code);
  v_row    public.member_claim_codes;
  v_owner  uuid;
begin
  if v_uid is null then
    raise exception 'Sign in first, then enter your code.';
  end if;

  -- Already linked: hand back the card rather than spending a second code.
  select id into v_owner from public.members where user_id = v_uid;
  if v_owner is not null then
    return v_owner;
  end if;

  if length(v_norm) < 8 then
    raise exception 'That code is too short. It is ten letters and numbers.';
  end if;

  select * into v_row from public.member_claim_codes
   where code_sha256 = sha256(convert_to(v_norm, 'UTF8'));

  /* One message for "no such code" and for "already used". Telling them apart
     would confirm that a given code was real, which is the one thing an
     attacker guessing codes wants to learn. */
  if v_row.id is null or v_row.used_at is not null then
    raise exception 'That code is not valid. Ask the committee for a new one.';
  end if;

  select user_id into v_owner from public.members where id = v_row.member_id;
  if v_owner is not null and v_owner <> v_uid then
    raise exception 'That card already belongs to an account. Speak to the committee.';
  end if;

  update public.members set user_id = v_uid where id = v_row.member_id;
  update public.member_claim_codes
     set used_at = now(), used_by = v_uid
   where id = v_row.id;

  return v_row.member_id;
end $$;

/* create or replace preserves grants, but they are restated so that running
   this file against a database where 0011 never ran leaves the same permissions
   as running 0011 would have. */
revoke all on function public.generate_claim_code() from anon, authenticated;
revoke all on function public.admin_issue_claim_code(uuid) from anon;
grant execute on function public.admin_issue_claim_code(uuid) to authenticated;
revoke all on function public.claim_member_with_code(text) from anon;
grant execute on function public.claim_member_with_code(text) to authenticated;


-- ===========================================================================
--  PART 2 — the committee filling in a card
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  The photograph: storage
--
--  0003 lets a member write only inside the folder named after their own slug.
--  This ADDS a policy for admins across the whole bucket; it does not touch the
--  member policies. Permissive policies are OR-ed, so a member keeps exactly
--  the access they had and an admin gains the rest of the bucket.
--
--  `for all` covers insert, update, select and delete: replacing a portrait is
--  an upload plus, eventually, tidying the old file away, and an admin who can
--  put a photo on a card should be able to take it off again.
-- ---------------------------------------------------------------------------
drop policy if exists "admins manage member photos" on storage.objects;
create policy "admins manage member photos" on storage.objects
  for all to authenticated
  using      (bucket_id = 'member-photos' and public.is_admin())
  with check (bucket_id = 'member-photos' and public.is_admin());

-- ---------------------------------------------------------------------------
--  The details: one function, admin-only
--
--  Why a function rather than widening the members UPDATE grant for admins:
--  the grant is column-scoped and shared with every authenticated member, so
--  there is no way to say "these columns, but only for your own row, unless you
--  are on the committee" in a grant. It has to be a SECURITY DEFINER that
--  checks is_admin() itself, which is how every other admin write on this
--  project already works.
--
--  NULL MEANS LEAVE IT ALONE, EMPTY STRING MEANS CLEAR IT.
--  Without that distinction the caller has to send every field on every save,
--  and the first form that forgets one silently wipes it. The photo field is
--  where this matters most: saving a changed profession must not remove the
--  portrait just because no new file was picked.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_member_profile(
  p_member_id     uuid,
  p_photo_path    text default null,
  p_profession    text default null,
  p_facebook_url  text default null,
  p_instagram_url text default null,
  p_tiktok_url    text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  update public.members set
    photo_path    = case when p_photo_path    is null then photo_path
                         else nullif(btrim(p_photo_path), '')    end,
    profession    = case when p_profession    is null then profession
                         else nullif(btrim(p_profession), '')    end,
    facebook_url  = case when p_facebook_url  is null then facebook_url
                         else nullif(btrim(p_facebook_url), '')  end,
    instagram_url = case when p_instagram_url is null then instagram_url
                         else nullif(btrim(p_instagram_url), '') end,
    tiktok_url    = case when p_tiktok_url    is null then tiktok_url
                         else nullif(btrim(p_tiktok_url), '')    end,
    updated_at    = now()
  where id = p_member_id;

  /* RLS and a missing row both come back as zero rows updated rather than as an
     error, so the row count has to be read explicitly. Without this the caller
     is told "saved" when nothing was written, which is the worst of the three
     possible outcomes. */
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'no such member';
  end if;
end $$;

revoke all on function public.admin_set_member_profile(uuid,text,text,text,text,text)
  from anon, authenticated;
grant execute on function public.admin_set_member_profile(uuid,text,text,text,text,text)
  to authenticated;
