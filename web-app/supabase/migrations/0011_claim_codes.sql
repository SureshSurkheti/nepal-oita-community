-- ===========================================================================
--  Proving that somebody is who they say they are, without paying for it
--
--  The problem
--  -----------
--  An account is easy: Supabase gives us email and password for nothing. But an
--  account only proves you own an email address, and an email address is not
--  membership. Something has to connect "this person signed up" to "this person
--  is Ganga Bahadur Tamang on the register", or the member directory is open to
--  anybody who can fill in a form.
--
--  What the free options actually are
--  ----------------------------------
--    Phone OTP by SMS   — the strongest, and the one this was built for. Needs a
--                         Twilio-style account: roughly ¥8-10 a message, and a
--                         bill that grows with the community. Ruled out.
--    Email magic links  — Supabase's built-in mailer is rate-limited to a
--                         handful an hour and is explicitly not for production.
--                         A member who cannot get a link cannot get in.
--    Email + password   — free and unlimited. Proves ownership of an email
--                         address and nothing else.
--
--  So: email and password for the ACCOUNT, and a one-time code for the
--  MEMBERSHIP. The committee already hands out membership cards at events and
--  already knows who everybody is — which makes them the verification step,
--  performed in person, for nothing. This just gives that a database.
--
--  How it goes
--  -----------
--    1. Committee issues a code for a member. It is shown once, then only its
--       hash is kept. They give it to that person — on the card, in the group
--       chat, at the next meetup.
--    2. The member signs up with any email and a password of their choosing.
--    3. They enter the code. It links their account to their card and is spent.
--
--  Note what this deliberately does NOT do: it never emails the code, so there
--  is no mail service to pay for, and it does not care whether the email address
--  is confirmed. The code is the credential. The email is only a way to log back
--  in — which is why "Confirm email" can be left off in the dashboard without
--  weakening anything that matters.
--
--  What it is not: proof against a member passing their code to somebody else.
--  Nothing short of checking documents is, and the committee handing the code
--  over in person is the check.
-- ===========================================================================

create table if not exists public.member_claim_codes (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,

  /* SHA-256, not bcrypt, and the reason is worth writing down. bcrypt salts,
     so every stored hash is different and a lookup has to scan every unused row
     and re-hash the input against each — twenty-eight slow hashes per attempt,
     and it gets worse as the community grows. bcrypt exists to defend low
     entropy secrets that people choose; this code is fifty random bits that
     nobody chose, so there is no dictionary to attack and a fast digest is the
     right tool. It is also unique and indexable, which is what makes the lookup
     a single row read. */
  code_sha256 bytea not null unique,

  issued_at   timestamptz not null default now(),
  used_at     timestamptz,
  used_by     uuid
);

create index if not exists member_claim_codes_member_idx
  on public.member_claim_codes (member_id, used_at);

alter table public.member_claim_codes enable row level security;

/* No grant for anon or authenticated at all — not even select. Everything goes
   through the two SECURITY DEFINER functions below, which is what keeps a
   member from reading the table to see whose codes are outstanding. */
revoke all on public.member_claim_codes from anon, authenticated;

-- ---------------------------------------------------------------------------
--  Generating a code
-- ---------------------------------------------------------------------------

/* Ten characters from a thirty-two letter alphabet: fifty bits, printed as
   XXXXX-XXXXX so it can be read down a phone or copied off a card.
   
   I, O, 0 and 1 are not in the alphabet. Somebody is going to read one of these
   out loud to somebody else, and "is that an oh or a zero" is a support request
   the committee should never have to answer. */
create or replace function public.generate_claim_code()
returns text language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes    bytea := gen_random_bytes(10);
  out      text := '';
  i        int;
begin
  for i in 0 .. 9 loop
    -- 256 is a whole multiple of 32, so the modulo is unbiased.
    out := out || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
  end loop;
  return substr(out, 1, 5) || '-' || substr(out, 6, 5);
end $$;

/* Punctuation, spaces and case are all thrown away before hashing, so the code
   matches however it was written down. Used by both functions, so they cannot
   normalise differently — which would produce a code that can be issued and
   never redeemed. */
create or replace function public.normalise_claim_code(p_code text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

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
  values (p_member_id, digest(public.normalise_claim_code(v_code), 'sha256'));

  -- Returned once and never again: only the digest is stored.
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
   where code_sha256 = digest(v_norm, 'sha256');

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

revoke all on function public.admin_issue_claim_code(uuid) from anon, authenticated;
grant execute on function public.admin_issue_claim_code(uuid) to authenticated;
revoke all on function public.claim_member_with_code(text) from anon;
grant execute on function public.claim_member_with_code(text) to authenticated;
revoke all on function public.generate_claim_code() from anon, authenticated;

-- ---------------------------------------------------------------------------
--  What the committee can see: whether a card has a live code, and whether it
--  has been used. Never the code itself — that is gone the moment it is issued.
-- ---------------------------------------------------------------------------
create or replace function public.admin_claim_code_status()
returns table (member_id uuid, issued_at timestamptz, used_at timestamptz)
language sql security definer set search_path = public as $$
  select c.member_id, c.issued_at, c.used_at
    from public.member_claim_codes c
   where public.is_admin()
     and c.id = (select c2.id from public.member_claim_codes c2
                  where c2.member_id = c.member_id
                  order by c2.issued_at desc limit 1)
$$;

revoke all on function public.admin_claim_code_status() from anon;
grant execute on function public.admin_claim_code_status() to authenticated;
