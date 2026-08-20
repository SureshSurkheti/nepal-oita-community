-- ===========================================================================
--  The 28 members already on the site, so nobody retypes them.
--
--  Names, roles and which list they belong in — and NO phone numbers. Numbers
--  are added one at a time through the Committee page (or with
--  admin_set_member_contact), because they are the one thing that should never
--  arrive in a file that lives in version control.
--
--  is_public_preview mirrors what the live site already shows a visitor who is
--  not signed in: the six office holders, and the first five entries of the
--  general register as a sample of it. The advisers and the rest of the register
--  are returned to signed-in members only — see 0005_preview.sql.
--
--  Note what that means before you rename these rows. 'Member A' through
--  'Member E' are placeholders and disclose nothing; the moment one is given a
--  real person's name it becomes public. Clear is_public_preview on that row
--  first, or ask them.
--
--  Safe to re-run: it matches on slug and updates rather than duplicating.
-- ===========================================================================

insert into public.members (slug, name, role, category, initials, is_public_preview, sort_order)
values
  ('prakash-rasaili', 'Prakash Rasaili', 'President', 'leadership', 'PR', true, 10),
  ('ganga-bahadur-tamang', 'Ganga Bahadur Tamang', 'Vice President', 'leadership', 'GT', true, 20),
  ('pragya-shah', 'Pragya Shah', 'Secretary', 'leadership', 'PS', true, 30),
  ('binita-lawgun', 'Binita Lawgun', 'Finance Manager', 'leadership', 'BL', true, 40),
  ('prabhakar-niroula', 'Prabhakar Niroula', 'Social Media Handler', 'leadership', 'PN', true, 50),
  ('suresh-surkheti', 'Suresh Surkheti', 'Technical Supporter', 'leadership', 'SS', true, 60),
  ('ashok-lama', 'Ashok Lama', 'Community work adviser', 'leadership', 'AL', false, 70),
  ('ashish-dheke', 'Ashish Dheke', 'Community work adviser', 'leadership', 'AD', false, 80),
  ('mahesh-giri', 'Mahesh Giri', 'Community work adviser', 'leadership', 'MG', false, 90),
  ('shannon-hoon', 'Shannon Hoon', 'Community work adviser', 'leadership', 'SH', false, 100),
  ('eva-tharu', 'Eva Tharu', 'Event adviser', 'leadership', 'ET', false, 110),
  ('yangi-sherpa-gole', 'Yangi Sherpa Gole', 'Event adviser', 'leadership', 'YG', false, 120),
  ('ruby-gauchan', 'Ruby Gauchan', 'Event adviser', 'leadership', 'RG', false, 130),
  ('member-01', 'Member A', null, 'general', 'A', true, 140),
  ('member-02', 'Member B', null, 'general', 'B', true, 150),
  ('member-03', 'Member C', null, 'general', 'C', true, 160),
  ('member-04', 'Member D', null, 'general', 'D', true, 170),
  ('member-05', 'Member E', null, 'general', 'E', true, 180),
  ('member-06', 'Member F', null, 'general', 'F', false, 190),
  ('member-07', 'Member G', null, 'general', 'G', false, 200),
  ('member-08', 'Member H', null, 'general', 'H', false, 210),
  ('member-09', 'Member I', null, 'general', 'I', false, 220),
  ('member-10', 'Member J', null, 'general', 'J', false, 230),
  ('member-11', 'Member K', null, 'general', 'K', false, 240),
  ('member-12', 'Member L', null, 'general', 'L', false, 250),
  ('member-13', 'Member M', null, 'general', 'M', false, 260),
  ('member-14', 'Member N', null, 'general', 'N', false, 270),
  ('member-15', 'Member O', null, 'general', 'O', false, 280)
on conflict (slug) do update
   set name              = excluded.name,
       role              = excluded.role,
       category          = excluded.category,
       initials          = excluded.initials,
       is_public_preview = excluded.is_public_preview,
       sort_order        = excluded.sort_order;

-- A contact row per member, empty for now, so the Committee page has something
-- to attach a number to.
insert into public.member_contacts (member_id)
select id from public.members
on conflict (member_id) do nothing;
