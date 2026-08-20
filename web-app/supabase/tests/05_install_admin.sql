-- The first committee account, for the install-path test.
--
-- A copy of what 0006_first_admin.sql does, with a phone number the tests own.
-- Deliberately NOT a sed of 0006 itself: that file is edited by the committee
-- with a real number, and a test that rewrites it breaks the moment somebody
-- does exactly what the file tells them to. (It did: the suite started failing
-- as soon as the real number went in, and the failure looked like a bug in
-- link_member_to_current_user rather than a stale test.)
do $$
declare v_id uuid;
begin
  insert into public.members (slug, name, role, category, initials, is_admin,
                              is_published, is_public_preview, sort_order)
  values ('suresh-surkheti', 'Suresh Surkheti', 'Technical Supporter', 'leadership',
          public.initials_for('Suresh Surkheti'), true, true, true, 10)
  on conflict (slug) do update
     set is_admin = true, name = excluded.name, role = excluded.role
  returning id into v_id;

  insert into public.member_contacts (member_id, phone_e164)
  values (v_id, '+818043164111')
  on conflict (member_id) do update set phone_e164 = excluded.phone_e164;
end $$;
