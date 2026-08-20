-- ===========================================================================
--  Link a login to a member card that already exists
--
--  Use this when the committee would rather set somebody up directly than issue
--  a code and wait for them to redeem it — the first few committee logins, or a
--  member who cannot manage the sign-up form.
--
--  It is the shortcut, not the normal path. The normal path is
--  /admin/members -> Issue a code, which needs no SQL and no dashboard, and
--  which the member completes themselves. Reach for this one sparingly: every
--  use of it is the committee choosing somebody's login for them.
--
--  ------------------------------------------------------------------ STEP 1
--  Make the account, which is the only thing this file cannot do:
--
--      Authentication -> Users -> Add user -> Create new user
--        Email:             the address below
--        Password:          you choose it, and you tell them
--        Auto Confirm User: TICK IT
--
--  ------------------------------------------------------------------ STEP 2
--  Edit the three values below and run this. Safe to re-run.
-- ===========================================================================

do $$
declare
  -- ##########################################################################
  -- ##  EDIT THESE THREE, THEN RUN.
  -- ##########################################################################
  v_email text    := 'surkhetisuresh123@gmail.com';    -- <<<< the address from step 1
  v_slug  text    := 'suresh-surkheti';            -- <<<< which card (see below)
  v_admin boolean := true;                    -- <<<< true = committee access
  -- ##########################################################################
  --
  --  v_slug is the card's id. To see the list:
  --      select slug, name, role, is_admin, user_id is not null as linked
  --        from public.members order by category, sort_order;
  --
  v_uid   uuid;
  v_id    uuid;
  v_owner uuid;
  v_held  text;
  v_name  text;
begin
  /* The guards check the values themselves rather than comparing against the
     placeholder text. An earlier version of this pattern tested
     `if v_email = 'CHANGE ME'`, and the same find-and-replace that filled the
     file in rewrote the guard too — so it refused correct input and accepted
     input nobody had touched. */
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-zA-Z]{2,}$' then
    raise exception 'v_email is not an email address: %', v_email;
  end if;
  if v_email like '%@example.com' then
    raise exception E'Nothing was changed. Edit the three values marked EDIT in this file:\n'
      '    v_email text    := ''%'';\n'
      '  becomes the address you used in Authentication -> Users -> Add user.', v_email;
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or v_slug = 'member-slug' then
    raise exception 'v_slug must be an existing card''s slug, lower case with dashes. Got: %', v_slug;
  end if;

  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise exception
      'No account for %. Step 1 first: dashboard -> Authentication -> Users -> '
      'Add user, and tick Auto Confirm User.', v_email;
  end if;

  select id, name, user_id into v_id, v_name, v_owner
    from public.members where slug = v_slug;
  if v_id is null then
    raise exception 'No member card with slug %. Run the SELECT in the comment above '
                    'to see the list.', v_slug;
  end if;

  /* Two guards that both protect somebody's access rather than the data.

     One card, one account: getCurrentMember() reads the caller's card with
     maybeSingle(), so an account holding two would not get "both" — it would get
     an error, and that person could not use the site at all. */
  if v_owner is not null and v_owner <> v_uid then
    -- Two plain % placeholders. raise's format string understands % and nothing
    -- else: %L is a format()/quote_literal thing, and here it printed the value
    -- followed by a stray "L", giving a copy-pasteable SQL statement that was
    -- not valid SQL.
    raise exception 'Card % is already linked to a different account. If that was a '
                    'mistake, release it first:  update public.members set user_id = '
                    'null where slug = ''%'';', v_slug, v_slug;
  end if;

  select string_agg(slug, ', ') into v_held
    from public.members where user_id = v_uid and id <> v_id;
  if v_held is not null then
    raise exception 'That account already holds card(s): %. One account, one card — '
                    'release the other first.', v_held;
  end if;

  update public.members
     set user_id  = v_uid,
         -- Never takes committee access away. Removing it is a separate, deliberate
         -- act, done on the Committee page where it is visible.
         is_admin = is_admin or v_admin
   where id = v_id;

  insert into public.member_contacts (member_id, email)
  values (v_id, v_email)
  on conflict (member_id) do update set email = excluded.email;

  raise notice '% can now sign in as % (card %)%.',
    v_email, v_name, v_slug,
    case when (select is_admin from public.members where id = v_id)
         then ', with committee access' else '' end;
end $$;
