-- ===========================================================================
--  The committee's login — ONE account, one password, shared
--
--  Run this ONCE, after editing the two values below. Not part of setup.sql,
--  because it names a real person's email address.
--
--  Before you run it
--  -----------------
--  Make the account in the dashboard, which is the only place that can create
--  one without an email being sent:
--
--      Authentication -> Users -> Add user -> Create new user
--        Email:            committee@nepal-oita.example      (your real address)
--        Password:         (choose one, write it down)
--        Auto Confirm User: TICK IT
--
--  Then put that same address in v_email below and run this. It links the
--  account to a member card and marks it committee.
--
--  About sharing one password
--  --------------------------
--  This is what was asked for and it does work, but be clear about what it
--  gives up, because it is not obvious until something goes wrong:
--
--    - The audit trail says "the committee" and never who. If a member is
--      deleted or a decision approved by mistake, there is no way to find out
--      who did it, or to ask them what they were thinking.
--    - It cannot be revoked from one person. When somebody leaves the committee
--      the password has to be changed and redistributed to everybody else.
--    - Shared passwords get shared again. It will end up in a group chat.
--
--  The alternative costs nothing: each committee member claims their own card
--  with their own code, the way every other member does, and you run
--  admin_set_admin on each of them. Same screens, same powers, and you can take
--  one person's access away without disturbing anybody else. Worth doing the
--  moment there is more than one person on the committee who logs in.
-- ===========================================================================

do $$
declare
  -- ##########################################################################
  -- ##  EDIT THE NEXT LINE BEFORE RUNNING THIS FILE.
  -- ##  It must be the same address you gave to Authentication -> Users.
  -- ##########################################################################
  v_email text := 'committee@nepal-oita.example';   -- <<<< CHANGE THIS
  v_name  text := 'Nepal-Oita Committee';
  v_slug  text := 'committee';
  -- ##########################################################################
  v_uid    uuid;
  v_member uuid;
begin
  /* The guards check the VALUES, not that the text still equals the placeholder.
     0006 made that mistake: `if v_email = 'CHANGE ME'` was itself rewritten by
     the find-and-replace it was meant to guard against, so it refused input that
     had been edited correctly and accepted input that had not. */
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-zA-Z]{2,}$' then
    raise exception 'v_email is not an email address: %', v_email;
  end if;
  if v_email like '%nepal-oita.example' then
    /* The message names the line and shows the edit, because the only person who
       ever sees it is somebody who ran the file straight from the repository —
       and "put your real one in" does not say where. */
    raise exception E'Nothing was changed. Edit the line marked EDIT ME near the top of this file:\n'
      '    v_email text := ''%'';\n'
      '  becomes\n'
      '    v_email text := ''you@yourdomain.com'';\n'
      '  using the SAME address you used for Authentication -> Users -> Add user.',
      v_email;
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'v_slug must be lower case with dashes: %', v_slug;
  end if;

  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise exception
      'No account for %. Make it first: dashboard -> Authentication -> Users -> '
      'Add user, and tick Auto Confirm User.', v_email;
  end if;

  -- If that account already holds a card, promote that card rather than making
  -- a second one and leaving the first orphaned.
  select id into v_member from public.members where user_id = v_uid;

  if v_member is null then
    insert into public.members (slug, name, role, category, initials,
                                is_published, is_public_preview, sort_order, user_id)
    values (v_slug, v_name, 'Committee', 'leadership',
            public.initials_for(v_name), true, true, 5, v_uid)
    on conflict (slug) do update
       set user_id = excluded.user_id,
           name    = excluded.name
    returning id into v_member;
  end if;

  insert into public.member_contacts (member_id, email)
  values (v_member, v_email)
  on conflict (member_id) do update set email = excluded.email;

  update public.members set is_admin = true where id = v_member;

  raise notice 'Committee access granted to % (member %).', v_email, v_member;
end $$;
