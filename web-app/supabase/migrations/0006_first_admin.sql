-- ===========================================================================
--  SUPERSEDED — use supabase/admin_account.sql instead.
--
--  This bootstraps the first committee member from a PHONE NUMBER, which was
--  right while sign-in was SMS one-time codes. It is not any more: sign-in is an
--  email address and a password, and membership is proved with a one-time code
--  (0011_claim_codes.sql). A phone number no longer signs anybody in, so running
--  this would create a card nobody can reach.
--
--  Kept only so that a project set up before that change still has the file that
--  was run against it. Do not run it on a new project.
-- ===========================================================================

-- ===========================================================================
--  THE FIRST ADMIN — run this once, by hand, and edit it first
--
--  There is a chicken-and-egg problem here and it is deliberate. Every admin
--  function checks is_admin(), which reads the members table. With no admin in
--  that table, nobody can create one through the app — which is exactly what
--  you want, because it means there is no "make me an admin" path reachable
--  from the internet.
--
--  So the first one is made here, in the Supabase SQL editor, by somebody who
--  already has the keys to the project.
--
--  TO USE:
--    1. Change the name, slug and phone number below to a real committee member.
--       The phone MUST be E.164 with the plus: +818043164111, not 080 4316 4111.
--    2. Run it in the Supabase dashboard → SQL editor.
--    3. That person signs in at /sign-in with that number. They can then add
--       everybody else through the Committee page.
--
--  Nothing else in this project inserts a row with is_admin = true.
-- ===========================================================================

do $$
declare
  v_name  text := 'Suresh Surkheti';                 -- e.g. 'Suresh Surkheti'
  v_slug  text := 'suresh-surkheti';                 -- e.g. 'suresh-surkheti'
  v_role  text := 'Technical Supporter';
  v_phone text := '+819042205405';             -- E.164, with the +
  v_id    uuid;
begin
  /* Checks what the values ARE, not whether they still equal the placeholder.
     The obvious guard — `if v_name = 'CHANGE ME'` — is broken by the very thing
     it is guarding against: search-and-replacing the placeholder rewrites the
     guard too, so a correctly edited file refuses to run. Validating instead is
     immune to that, and catches a typo'd number into the bargain. */
  if v_phone !~ '^\+81[789]0\d{8}$' then
    raise exception 'v_phone must be a Japanese mobile in E.164 form, e.g. +818043164111 '
      '(got %). Edit the values at the top of this file first.', v_phone;
  end if;

  if btrim(coalesce(v_name, '')) = '' or v_name ~* 'change' then
    raise exception 'Set v_name to the committee member''s real name first (got %).', v_name;
  end if;

  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or v_slug ~* 'change' then
    raise exception 'v_slug must be lower-case-with-hyphens, e.g. suresh-surkheti (got %).', v_slug;
  end if;

  insert into public.members (slug, name, role, category, initials, is_admin,
                              is_published, is_public_preview, sort_order)
  values (v_slug, v_name, v_role, 'leadership', public.initials_for(v_name),
          true, true, true, 10)
  on conflict (slug) do update
     set is_admin = true, name = excluded.name, role = excluded.role
  returning id into v_id;

  insert into public.member_contacts (member_id, phone_e164)
  values (v_id, v_phone)
  on conflict (member_id) do update set phone_e164 = excluded.phone_e164;

  raise notice 'Committee access granted to % (%). Sign in with %.', v_name, v_slug, v_phone;
end $$;
