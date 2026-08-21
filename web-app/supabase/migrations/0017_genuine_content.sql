-- ===========================================================================
--  Placeholder content out, the community's own content in
--
--  Two things in the seed were stand-ins, and both had started to look like real
--  data to anybody reading the site:
--
--    * fifteen general members called 'Member A' through 'Member O'
--    * six community stories signed with names of people who do not exist
--
--  The placeholders are replaced by the seven general members the committee gave,
--  and the stories by five drafts signed with names from the register.
--
--  The invented names were the worse of the two. A visitor has no way to tell a
--  made-up testimonial from a real one, and a register padded with letters of the
--  alphabet is worse than a short honest one.
--
--  READ THIS BEFORE PUBLISHING — the five stories below
--  ----------------------------------------------------
--  They are signed with the names of REAL people on the committee, and they were
--  DRAFTED, not collected. Nobody has said these words. They are here because
--  the alternative was inventing more people, and because five plausible drafts
--  with the right names on them are something the committee can read, correct in
--  two minutes at /admin/stories, and own.
--
--  Show each person their quote. Change the wording to what they actually want to
--  say, or delete the row. Attributing a sentence to a named person who did not
--  say it is the kind of thing that embarrasses somebody in a small community,
--  and it is trivially avoidable — the edit form is already there.
--
--  Written in the languages the community actually uses, because the register is
--  Nepali-speaking and the audience is partly Japanese: two in Devanagari, one in
--  romanised Nepali, one in Japanese, one in English.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  1. The fifteen placeholder members
--
--  Every foreign key that points at members either cascades (member_contacts,
--  member_claim_codes) or nulls (stories.member_id, meetings.submitted_by,
--  events.submitted_by, photos.submitted_by), so this is safe without any
--  clean-up beforehand. Matched on the seeded slugs, so a real person added
--  through the Committee page since is untouched whatever they are called.
-- ---------------------------------------------------------------------------
delete from public.members
 where slug in ('member-01','member-02','member-03','member-04','member-05',
                'member-06','member-07','member-08','member-09','member-10',
                'member-11','member-12','member-13','member-14','member-15');

-- ---------------------------------------------------------------------------
--  1b. The seven real general members, given by the committee
--
--  These are actual people, so two things follow that did not apply to 'Member
--  A'.
--
--  Seven, not six, and the seventh is not padding: below seven general members
--  the "See all" control on the home page suppresses itself, because with a
--  five-column row it would be hiding exactly one card and a button that reveals
--  one card is worse than showing it. Measured, not guessed — 7 is the first
--  count at which it appears on a desktop. Their names are PUBLIC the moment this runs — every published member has
--  been public since 0010 — on the home page and on /members. That page carries
--  `noindex`, so the names will not turn up in a Google search for them, but
--  anybody who visits the site will read them. If any of the six would rather not
--  be listed, set `is_published = false` on their row and they disappear from both
--  while keeping their card and their sign-in.
--
--  And no phone numbers here, the same rule the rest of the seed follows: numbers
--  go in one at a time through the Committee page, never into a file in version
--  control.
--
--  Initials come from initials_for() rather than being typed, so 'Mahesh
--  Chaulagain' cannot end up as 'MB' because somebody copied the line above.
--
--  Safe to re-run: matched on slug, and it updates rather than duplicating.
-- ---------------------------------------------------------------------------
insert into public.members (slug, name, role, category, initials,
                            is_public_preview, sort_order)
values
  ('nagendra-dahal',    'Nagendra Dahal',    null, 'general',
   public.initials_for('Nagendra Dahal'),    true, 140),
  ('santosh-basnet',    'Santosh Basnet',    null, 'general',
   public.initials_for('Santosh Basnet'),    true, 150),
  ('yaman-bhattarai',   'Yaman Bhattarai',   null, 'general',
   public.initials_for('Yaman Bhattarai'),   true, 160),
  ('mahesh-chaulagain', 'Mahesh Chaulagain', null, 'general',
   public.initials_for('Mahesh Chaulagain'), true, 170),
  ('manoj-badu',        'Manoj Badu',        null, 'general',
   public.initials_for('Manoj Badu'),        true, 180),
  ('santosh-koirala',   'Santosh Koirala',   null, 'general',
   public.initials_for('Santosh Koirala'),   true, 190),
  ('milan-thapa',       'Milan Thapa',       null, 'general',
   public.initials_for('Milan Thapa'),       true, 200)
on conflict (slug) do update
   set name              = excluded.name,
       category          = excluded.category,
       initials          = excluded.initials,
       is_public_preview = excluded.is_public_preview,
       sort_order        = excluded.sort_order;

-- An empty contact row each, so the Committee page has something to attach a
-- number to. Same statement 0007 ends with, and harmless if it already ran.
insert into public.member_contacts (member_id)
select id from public.members
on conflict (member_id) do nothing;

-- ---------------------------------------------------------------------------
--  2. The six invented stories
--
--  Matched by name rather than truncating the table, so a story a real member
--  has submitted through the site is not swept away with them.
-- ---------------------------------------------------------------------------
delete from public.stories
 where author_name in ('Rajesh Shrestha','Sita Gurung','Anil Tamang',
                       'Sunita Magar','Dipesh Bhandari','Kenji Matsuda');

-- ---------------------------------------------------------------------------
--  3. Five drafts, signed by people who exist
--
--  `member_id` is resolved from the slug rather than hard-coded, so each story is
--  tied to its author's card — which is what lets their portrait appear beside
--  the quote once they upload one, instead of an initial in a circle for ever.
--
--  Safe to re-run: skipped if a story with that author name is already there,
--  so re-pasting setup.sql does not undo an edit somebody has made.
-- ---------------------------------------------------------------------------
insert into public.stories (member_id, author_name, author_role, quote, status, sort_order)
select m.id, v.author_name, v.author_role, v.quote, v.status, v.sort_order
  from (values
    -- Nepali, Devanagari. The president, on what the seven years added up to.
    ('prakash-rasaili', 'Prakash Rasaili', 'President',
     'सन् २०१९ मा हामी गन्न सकिने जति मात्र थियौँ। अघिल्लो दशैंमा हलभरि मान्छे देख्दा '
     || 'आफ्नै गाउँको चोकमा उभिएको जस्तो लाग्यो। हामीले बनाउन खोजेको यही थियो।',
     'approved', 10),

    -- Nepali, Devanagari. The first month is the thing people remember.
    ('binita-lawgun', 'Binita Lawgun', 'Finance Manager',
     'नयाँ आउनेहरूलाई पहिलो महिना सबैभन्दा गाह्रो हुन्छ — फोन, बैंक, वार्ड अफिस। '
     || 'एक्लै गए अलमल हुन्छ, कोही सँगै गए आधा घण्टाको काम हुन्छ। हामी त्यही गर्छौं।',
     'approved', 20),

    -- Romanised Nepali. Written the way people actually type it in a group chat.
    ('suresh-surkheti', 'Suresh Surkheti', 'Technical Supporter',
     'Beppu ma aayeko pahilo haptaa malaai kohi station maa linna aayeko thiyo. '
     || 'Tyo din kasto sajilo bhayeko thiyo, aile pani yaad chha. Aaja tyahi kaam '
     || 'ma naya aaunelaai gardai chhu.',
     'approved', 30),

    -- Japanese, for the neighbours and the halls that host us.
    ('ruby-gauchan', 'Ruby Gauchan', 'Event adviser',
     '毎年お祭りを開けるのは、会場を貸してくださる地域の皆さんのおかげです。'
     || 'ダサインでもティハールでも、近所の方が来て一緒に食べてくださるのが一番うれしいです。',
     'approved', 40),

    -- English.
    ('pragya-shah', 'Pragya Shah', 'Secretary',
     'We write the minutes down now, so nobody has to remember what was agreed or '
     || 'take somebody''s word for it. It sounds like a small thing. It changed how '
     || 'the committee works.',
     'approved', 50)
  ) as v(slug, author_name, author_role, quote, status, sort_order)
  join public.members m on m.slug = v.slug
 where not exists (
   select 1 from public.stories s where s.author_name = v.author_name);
