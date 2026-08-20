-- Three people and three phones, standing in for the real register.
insert into auth.users (id, phone) values
  ('11111111-1111-1111-1111-111111111111', '818043164111'),   -- admin
  ('22222222-2222-2222-2222-222222222222', '818011112222'),   -- ordinary member
  ('33333333-3333-3333-3333-333333333333', '818099998888');   -- not on the register

-- is_public_preview is still set explicitly, though 0010 stopped the read policy
-- consulting it. The homepage uses it to decide which cards sit above the "see
-- all" control, so it is still worth having a mix here.
--
-- The fourth row is the one that keeps the read policy honest. Every published
-- member is public now, so a test that only counts rows would pass just as well
-- against a policy of `using (true)`. An unpublished draft is the only thing
-- that can tell those two apart.
-- can_contribute is set explicitly, like is_public_preview above and for the
-- same reason: 0013 seeds it from category in a one-off UPDATE that ran before
-- these rows existed. Left to the column default every fixture would be false,
-- and "a leadership member can add an event" would be untestable while looking
-- like it had been tested.
insert into public.members (id, slug, name, role, category, initials, is_admin, is_public_preview, is_published, can_contribute) values
  ('aaaaaaaa-0000-0000-0000-000000000001','suresh-surkheti','Suresh Surkheti','Technical Supporter','leadership','SS', true,  true,  true,  true),
  ('aaaaaaaa-0000-0000-0000-000000000002','prakash-rasaili','Prakash Rasaili','President','leadership','PR', false, true,  true,  true),
  ('aaaaaaaa-0000-0000-0000-000000000003','member-a','Member A',null,'general','MA', false, false, true,  false),
  ('aaaaaaaa-0000-0000-0000-000000000004','draft-person','Draft Person',null,'general','DP', false, false, false, false);

insert into public.member_contacts (member_id, phone_e164, facebook_url) values
  ('aaaaaaaa-0000-0000-0000-000000000001','+818043164111','https://facebook.com/one'),
  ('aaaaaaaa-0000-0000-0000-000000000002','+818011112222','https://facebook.com/two'),
  ('aaaaaaaa-0000-0000-0000-000000000003',null,null),
  ('aaaaaaaa-0000-0000-0000-000000000004',null,null);

/* 0010 moved Facebook links from member_contacts (private) to members (public)
   and copied across whatever was already entered. That copy is a one-off inside
   the migration, which ran before these fixtures existed — so replaying it here
   is the only way the statement gets exercised at all. It is written exactly as
   0010 has it, guard included, so a change there has to be made here too and
   the test will say so.
   
   This matters because the committee may well have typed Facebook URLs into the
   old column before upgrading, and silently losing them would look like the
   members simply had not filled the field in. */
update public.members m
   set facebook_url = c.facebook_url
  from public.member_contacts c
 where c.member_id = m.id
   and m.facebook_url is null
   and c.facebook_url is not null;
