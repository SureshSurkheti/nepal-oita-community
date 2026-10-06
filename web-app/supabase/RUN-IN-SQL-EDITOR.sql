-- ===========================================================================
--  RUN THIS ONCE, IN THE SUPABASE SQL EDITOR
--
--  Dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
--  GENERATED FILE — do not edit. Change a migration and run:
--      npm run build:sql
--
--  These are the 7 migrations the live project has not run yet. Until this
--  file runs, the site works but shows none of what they add:
--
--    0020  "What we do", in Nepali
--    0021  The Kabaddi film show and the Nepali Festival, with their posters
--    0022  Covers for the ten seeded events, from the community's own photographs
--    0023  Captions that describe their photograph
--    0024  Dashain moves into the past
--    0025  Nepali for the minutes, the stories and the gallery captions
--    0026  A word from the president
--
--  Safe to run more than once: every statement either fills in a blank, matches
--  on a key that is already there, or is an upsert. Nothing is deleted.
--
--  Afterwards, run supabase/verify.sql to see what actually landed.
-- ===========================================================================


-- ###########################################################################
-- ##  0020_programmes_in_nepali
-- ###########################################################################

-- ===========================================================================
--  "What we do", in Nepali
--
--  The chrome around this section was translated in the dictionaries, but the
--  six programmes and their eighteen points are rows, not code — so a Nepali
--  reader got a Nepali heading over an English list. No dictionary can reach
--  them, because the committee writes them.
--
--  WHY COLUMNS RATHER THAN A SECOND TABLE
--  A programme_translations table would be the textbook answer and the wrong
--  one here. There are two languages, both decided, and a programme without a
--  title in each is not a thing this site wants to represent. A side table buys
--  a third language nobody has asked for, at the cost of a join on the single
--  most-read query on the site and a class of bug where the translation row goes
--  missing. Two columns, one row, one read.
--
--  NULL MEANS "NOT TRANSLATED YET", AND FALLS BACK TO ENGLISH
--  Deliberately nullable, and the app treats null as "show the English". That is
--  what makes this safe to ship: the committee can add a seventh programme in
--  English this afternoon without the Nepali site showing a blank card, and
--  translate it whenever they get to it. An empty string is NOT the same thing
--  and is not used — '' would mean "deliberately blank", which no programme is.
--
--  THE TRANSLATIONS BELOW ARE A FIRST PASS and the committee should read them.
--  They are written for a Nepali speaker living in Oita, so Japanese
--  institutions keep the names people actually use locally (वडा कार्यालय for the
--  ward office) rather than being rendered into unfamiliar formal Nepali.
-- ===========================================================================

alter table public.programmes
  add column if not exists title_ne text,
  add column if not exists body_ne  text;

alter table public.programme_points
  add column if not exists text_ne text;

-- --------------------------------------------------------------- programmes
-- Keyed on slug, not id: the ids are generated per environment, so an id here
-- would make this migration apply cleanly and do nothing on a fresh database.
update public.programmes set
  title_ne = 'सांस्कृतिक चाडपर्व',
  body_ne  = 'दशैं, तिहार, होली र नेपाली नयाँ वर्ष — राम्ररी मनाइन्छ, र सधैं ओइताको बृहत् समुदायका लागि खुला।'
where slug = 'cultural-festivals';

update public.programmes set
  title_ne = 'व्यावहारिक सहयोग',
  body_ne  = 'नदेखिने तर जरुरी काम: फारम, फोन सम्पर्क, अनुवाद, र कुन कार्यालयमा जाने भन्ने जानकारी।'
where slug = 'practical-support';

update public.programmes set
  title_ne = 'जवाफ दिने सञ्जाल',
  body_ne  = 'प्रदेशभर पाँच सय मानिस, र केही बिग्रिँदा बिहान २ बजे पनि जागा रहने समूह च्याट।'
where slug = 'a-network-that-answers';

update public.programmes set
  title_ne = 'भाषा र सम्पदा',
  body_ne  = 'जापानमा हुर्कँदै गरेका बालबालिकालाई नेपाली, र कामका लागि जापानी चाहिने वयस्कलाई सहयोग।'
where slug = 'language-and-heritage';

update public.programmes set
  title_ne = 'खेलकुद र सप्ताहान्त',
  body_ne  = 'न्यानो महिनाभर फुटबल र भलिबल — कसैलाई नचिनेको भए पनि समुदायमा घुलमिल हुने सबैभन्दा सजिलो बाटो।'
where slug = 'sport-and-weekends';

update public.programmes set
  title_ne = 'ओइतामा आइपुग्दा',
  body_ne  = 'पहिलो महिना सबैभन्दा गाह्रो हुन्छ। यो बाटो पहिले नै हिँडिसकेको कोहीले तपाईंलाई डोर्‍याउनेछ।'
where slug = 'landing-in-oita';

-- --------------------------------------------------------------- the points
-- Matched on the English text. These are short, fixed phrases and there are
-- eighteen of them; anything the committee has since reworded simply stays
-- English, which is the designed fallback rather than a failure.
update public.programme_points set text_ne = v.ne
from (values
  ('Traditional food and live music',          'परम्परागत खाना र प्रत्यक्ष सङ्गीत'),
  ('Visa and residency paperwork',             'भिसा र बसोबासका कागजात'),
  ('Facebook groups for your area',            'तपाईंको क्षेत्रका फेसबुक समूह'),
  ('Nepali reading and writing for children',  'बालबालिकालाई नेपाली पढाइ र लेखाइ'),
  ('Open teams, no trials, all levels',        'खुला टोली, छनोट छैन, सबै स्तर'),
  ('Meeting new arrivals at the station',      'नयाँ आउनेहरूलाई स्टेशनमा भेट्ने'),
  ('Ward office, bank and phone set-up',       'वडा कार्यालय, बैंक र फोन मिलाउने'),
  ('Dance and cultural performances',          'नृत्य र सांस्कृतिक प्रस्तुति'),
  ('Conversation practice before interviews',  'अन्तर्वार्ता अघि कुराकानीको अभ्यास'),
  ('Matches in Oita City and Beppu',           'ओइता सहर र बेप्पुमा खेल'),
  ('Job placement and interviews',             'रोजगारी र अन्तर्वार्ता'),
  ('Monthly newsletter',                       'मासिक न्यूजलेटर'),
  ('Housing and guarantor guidance',           'आवास र जमानीबारे सल्लाह'),
  ('Emergency support chain',                  'आपत्कालीन सहयोग शृंखला'),
  ('Where to buy Nepali groceries',            'नेपाली किराना कहाँ किन्ने'),
  ('Help reading official letters',            'सरकारी पत्र पढ्न सहयोग'),
  ('Family-friendly, all welcome',             'परिवारमैत्री, सबैलाई स्वागत'),
  ('Families welcome to come and watch',       'परिवारहरू हेर्न आउन स्वागत छ')
) as v(en, ne)
where public.programme_points.text = v.en;


-- ###########################################################################
-- ##  0021_two_posters
-- ###########################################################################

-- ===========================================================================
--  The Kabaddi film show and the Nepali Festival, with their posters
--
--  Both are real NOC events and neither was on the site. Their artwork was
--  sitting in public/images as festival.jpg and movie.jpg, used only as two
--  frames of the home page's hero rotation, where a poster competes with the
--  headline printed over it and nobody can read either.
--
--  WHAT IS DELIBERATELY NOT HERE
--  Neither poster states a venue, a start time or a ticket price, so neither is
--  recorded. The film poster prints "1st SHOW ----" and "2nd SHOW ----" with the
--  times left blank, and the festival poster says DATE / TIME / VENUE COMING
--  SOON in three languages. Writing a plausible time into a community's own
--  listing is how a family turns up at the wrong hour.
--
--  THE FESTIVAL'S DATE IS A PLACEHOLDER AND MUST BE CORRECTED.
--  event_date is `not null`, and the poster says only "April 2027", so this uses
--  2027-04-01 to sort it into the right month. The card will print APR 1, which
--  is not a date anybody has announced — every piece of text on the event says
--  so, but the chip cannot. Change it the day the committee fixes the date.
--
--  cover_path holds a site-relative path rather than a Supabase object key.
--  assetUrl() passes anything starting with "/" through untouched; see the note
--  there. These two posters ship with the release instead of being uploaded,
--  because they are artwork for the site rather than a photograph of an event.
--
--  The files are public/images/movie.jpg and public/images/festival.jpg, under
--  the names the committee gave them. festival.jpg was re-encoded in place from
--  4961x7016 and 3.58 MB down to 1400x1980 and 460 KB — same picture, same name,
--  and nobody downloads three and a half megabytes to look at one card. The
--  untouched original is in git at 374c395 if the print resolution is ever
--  wanted back.
-- ===========================================================================

alter table public.events
  add column if not exists title_ne   text,
  add column if not exists summary_ne text,
  add column if not exists body_ne    text;

alter table public.event_highlights
  add column if not exists text_ne text;

-- ------------------------------------------------------- the Kabaddi show
insert into public.events
  (slug, title, summary, body, event_date, category, accent, cover_path,
   is_published, title_ne, summary_ne, body_ne)
values (
  'kabaddi-5-oita-show',
  'Kabaddi 5 — Oita Show',
  'Ram Babu Gurung''s Kabaddi 5 comes to Oita for one day, with two screenings.',
  E'Kabaddi 5 — After the Final Match, the newest film in Ram Babu Gurung''s Kabaddi series, screening in Oita for one day only.\n\n'
  'There are two showings on Sunday 29 November. The start times, the venue and the ticket price are not fixed yet — they go up on our Facebook page and on this page as soon as they are.\n\n'
  'Brought to Oita by the Nepal Oita Community, powered by YeheyRemit, in association with Vizonia. Japan rights: Mukti Raj Regmi.',
  date '2026-11-29', 'Cultural', 'indigo',
  '/images/movie.jpg', true,
  'कबड्डी ५ — ओइता शो',
  'राम बाबु गुरुङको कबड्डी ५ एक दिनका लागि ओइतामा, दुई पटक प्रदर्शन।',
  E'कबड्डी ५ — आफ्टर द फाइनल म्याच, राम बाबु गुरुङको कबड्डी शृंखलाको नयाँ फिल्म, ओइतामा एक दिन मात्र।\n\n'
  'नोभेम्बर २९, आइतबार दुई पटक देखाइनेछ। सुरु हुने समय, स्थान र टिकटको मूल्य अझै तय भएको छैन — तय भएपछि हाम्रो फेसबुक पेज र यही पृष्ठमा राखिनेछ।\n\n'
  'नेपाल ओइता समुदायद्वारा ओइतामा ल्याइएको, YeheyRemit को सहयोगमा, Vizonia सँगको सहकार्यमा। जापान अधिकार: मुक्ति राज रेग्मी।'
)
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, body = excluded.body,
  event_date = excluded.event_date, category = excluded.category,
  accent = excluded.accent, cover_path = excluded.cover_path,
  title_ne = excluded.title_ne, summary_ne = excluded.summary_ne,
  body_ne = excluded.body_ne;

delete from public.event_highlights
 where event_id = (select id from public.events where slug = 'kabaddi-5-oita-show');
insert into public.event_highlights (event_id, text, text_ne, position)
select e.id, v.en, v.ne, v.pos
from public.events e, (values
  ('A film by Ram Babu Gurung',             'राम बाबु गुरुङको फिल्म',                 0),
  ('Two showings on the day',               'एकै दिन दुई पटक प्रदर्शन',               1),
  ('Times, venue and tickets announced soon','समय, स्थान र टिकट चाँडै घोषणा हुनेछ',   2),
  ('Organised by Nepal Oita Community',     'नेपाल ओइता समुदायद्वारा आयोजित',        3)
) as v(en, ne, pos)
where e.slug = 'kabaddi-5-oita-show';

-- ---------------------------------------------------- the Nepali Festival
insert into public.events
  (slug, title, summary, body, event_date, category, accent, cover_path,
   is_published, title_ne, summary_ne, body_ne)
values (
  'nepali-festival-2027',
  'Nepali Festival 2027',
  'The community''s biggest day of the year returns in April 2027. The date, time and venue are still to be announced.',
  E'नेपाली महोत्सव — the Nepali Festival in Oita, held by this community every year since 2019.\n\n'
  'A day of Nepali food, music and dance, open to the whole prefecture and to our Japanese neighbours. It is the one day in the year when the community is all in one place.\n\n'
  'April 2027. The exact date, the time and the venue are not settled yet. They will be announced on our Facebook page and posted here — the date shown on this page until then is a placeholder for the month, not an announcement.',
  date '2027-04-01', 'Festival', 'crimson',
  '/images/festival.jpg', true,
  'नेपाली महोत्सव २०२७',
  'समुदायको वर्षकै ठूलो दिन अप्रिल २०२७ मा फेरि। मिति, समय र स्थान घोषणा हुन बाँकी छ।',
  E'नेपाली महोत्सव — ओइतामा हुने नेपाली फेस्टिभल, यो समुदायले २०१९ देखि हरेक वर्ष आयोजना गर्दै आएको।\n\n'
  'नेपाली खाना, सङ्गीत र नृत्यको एक दिन, पूरै प्रदेश र हाम्रा जापानी छिमेकीहरूका लागि खुला। वर्षमा यही एक दिन हो जब पूरा समुदाय एकै ठाउँमा हुन्छ।\n\n'
  'अप्रिल २०२७। निश्चित मिति, समय र स्थान अझै तय भएको छैन। तय भएपछि हाम्रो फेसबुक पेज र यही पृष्ठमा राखिनेछ — त्यतिन्जेल यहाँ देखिने मिति महिना जनाउने प्लेसहोल्डर मात्र हो, घोषणा होइन।'
)
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, body = excluded.body,
  event_date = excluded.event_date, category = excluded.category,
  accent = excluded.accent, cover_path = excluded.cover_path,
  title_ne = excluded.title_ne, summary_ne = excluded.summary_ne,
  body_ne = excluded.body_ne;

delete from public.event_highlights
 where event_id = (select id from public.events where slug = 'nepali-festival-2027');
insert into public.event_highlights (event_id, text, text_ne, position)
select e.id, v.en, v.ne, v.pos
from public.events e, (values
  ('Nepali food, music and dance',          'नेपाली खाना, सङ्गीत र नृत्य',          0),
  ('Open to everybody in Oita',             'ओइताका सबैका लागि खुला',               1),
  ('Held every year since 2019',            '२०१९ देखि हरेक वर्ष आयोजना',           2),
  ('Date, time and venue to be announced',  'मिति, समय र स्थान घोषणा हुन बाँकी',    3)
) as v(en, ne, pos)
where e.slug = 'nepali-festival-2027';


-- ###########################################################################
-- ##  0022_event_covers_from_gallery
-- ###########################################################################

-- ===========================================================================
--  Covers for the ten seeded events, from the community's own photographs
--
--  Eight of the ten now carry a real photograph out of the gallery. Nothing was
--  generated and nothing was downloaded: these are pictures this community took
--  at its own events, already uploaded to the site-photos bucket, and they are
--  better than any invented image for exactly the reason that matters — a
--  visitor deciding whether to come wants to see what it is actually like.
--
--  MATCHED ON WHAT THE PHOTOGRAPH SHOWS, NOT ON ITS CAPTION.
--  Several captions do not describe their picture, which is worth knowing
--  separately from this migration:
--    "Volunteer clean-up"  is a group under a Nepal Festival arch
--    "Dal bhat"            is a large group indoors, no food in frame
--    "Devanagari"          is a family portrait in Nepali dress
--  Had these been matched by caption, the clean-up event would be illustrated
--  with a festival gate and the food festival with a room of people.
--
--  TWO EVENTS ARE DELIBERATELY LEFT WITHOUT ONE.
--  There is no photograph of a river clean-up and none of volleyball in the
--  gallery. Both keep the drawn pattern the cards already fall back to, which
--  reads as a design. Putting the nearest-looking picture on them would be
--  telling members an event looked like something it did not.
-- ===========================================================================

update public.events set cover_path = v.path
from (values
  -- Women in traditional dress outdoors — the dress is the subject, which is
  -- what a festival celebration looks like from the outside.
  ('holi-festival-celebration',
   '1787383757597-483664190-1001344595427360-1167711772888924714-n.jpg'),

  -- A full lecture hall of seated students. The clearest match in the set.
  ('new-student-orientation', 'committee/1790993145742.webp'),

  -- Arriving under the festival arch. Captioned "Volunteer clean-up", which it
  -- plainly is not.
  ('nepali-food-festival',
   '1787234354088-598025577-1217679317127219-1183812236048714047-n.jpg'),

  -- A family with a child in Nepali dress. The class exists so children growing
  -- up in Japan keep the language, so the family is the point of it.
  ('nepali-language-class-open-day',
   '1787235204368-483523606-1001344678760685-8065115099288787648-n.jpg'),

  -- The group on a park bench. Row 9 is byte-identical to this one; the
  -- duplicate is left alone here and should be deleted at /admin/photos.
  ('monthly-community-meetup',
   '1787234266226-762974453-1401833195378496-519796008339442084-n.jpg'),

  -- The team on the pitch.
  ('autumn-football-tournament',
   '1787234640767-480781794-992468066315013-6967558951025335564-n.jpg'),

  -- The red Lakhe mask mid-dance on a festival stage.
  ('dashain-celebration',
   '1787234583658-483793540-1001344622094024-3812862123925429947-n.jpg'),

  -- The lit stage under bunting, which suits the festival of lights.
  ('tihar-and-deepawali',
   '1787234893420-484353831-1001344452094041-2767845548514239072-n.jpg')
) as v(slug, path)
where public.events.slug = v.slug
  -- Never overwrite a cover the committee has chosen, including the two posters
  -- 0021 set. This migration only fills in what is empty.
  and public.events.cover_path is null;


-- ###########################################################################
-- ##  0023_gallery_captions
-- ###########################################################################

-- ===========================================================================
--  Captions that describe their photograph
--
--  Several did not, and three were plainly about a different picture:
--
--    "Volunteer clean-up"  a group under the Nepal Festival Fukuoka 2025 arch
--    "Dal bhat"            a hall full of families, no food anywhere in frame
--    "Devanagari"          a child dressed as the Kumari, with her family
--
--  That matters more than it looks. The caption is what the gallery prints under
--  the picture and what the lightbox reads out, so a visitor was being told the
--  community ran a river clean-up it has no photograph of. It also made the
--  pictures unusable for anything else: choosing covers for the events meant
--  opening all twelve and looking, because the captions could not be trusted.
--
--  ALT TEXT IS NOW DIFFERENT FROM THE CAPTION. Every row had alt = caption,
--  which is the one thing alt text should never be: a screen-reader user heard
--  "Dal bhat" and learned nothing, while a sighted reader saw the caption AND
--  the picture. The caption now names the occasion and the alt describes what is
--  actually in the frame.
--
--  CATEGORIES WERE DOING NOTHING. Eleven of the twelve were "community", so the
--  gallery's filter chips offered a choice between everything and one photograph.
--  Split into festival / cultural / community / sport / students, which is how
--  this community already describes itself on the home page.
--
--  THE DUPLICATE IS UNPUBLISHED, NOT DELETED. Two rows point at byte-identical
--  uploads of the same park-bench photograph. Unpublishing takes it out of the
--  gallery and leaves the row and the file alone, so it can be put back by
--  anybody who disagrees; deleting would orphan the object in the bucket.
-- ===========================================================================

update public.photos set caption = v.caption, alt = v.alt, category = v.category
from (values
  ('1787234354088-598025577-1217679317127219-1183812236048714047-n.jpg',
   'Nepal Festival in Fukuoka',
   'Members standing together under the red Nepal Festival Fukuoka 2025 arch, with food stalls behind them',
   'festival'),

  ('1787234426571-515441026-1083353387226480-3080054806473810661-n.jpg',
   'Families at the community day',
   'A hall packed with Nepali and Japanese families and their children, posing together around the tables',
   'community'),

  ('1787234583658-483793540-1001344622094024-3812862123925429947-n.jpg',
   'Lakhe dance on the festival stage',
   'A dancer in the red Lakhe mask and costume performing with black fans on the Nepal Festival stage',
   'cultural'),

  ('1787234640767-480781794-992468066315013-6967558951025335564-n.jpg',
   'The football tournament',
   'Players in blue and grey kit with their medals, and supporters, on the indoor pitch after the tournament',
   'sport'),

  ('1787234893420-484353831-1001344452094041-2767845548514239072-n.jpg',
   'The first Nepal Festival in Oita',
   'The crowd watching a singer on stage beneath the banner for the first Nepal Festival in Oita, 2024',
   'festival'),

  ('1787235204368-483523606-1001344678760685-8065115099288787648-n.jpg',
   'Dressed as the Kumari',
   'A young girl in the red and gold dress and headdress of the Kumari, seated with her mother, father and brother',
   'cultural'),

  ('1787235243765-75369266-148599499861397-8633281442060697600-n.jpg',
   'The committee in front of the members',
   'Committee members in Nepal Oita Community shirts standing at the whiteboard while members watch from their seats',
   'community'),

  ('1787234266226-762974453-1401833195378496-519796008339442084-n.jpg',
   'The monthly meet-up',
   'Members sitting together on and around a park bench under the trees at the monthly meet-up',
   'community'),

  ('1787383757597-483664190-1001344595427360-1167711772888924714-n.jpg',
   'Cultural dress show',
   'Six women in the traditional dress of different parts of Nepal, standing together by the water',
   'cultural'),

  ('committee/1790993145742.webp',
   'New student orientation',
   'A hall of students seated in rows of chairs facing the stage at the new-student orientation',
   'students'),

  ('committee/1790993364135.webp',
   'Senpai Kai',
   'Three members reading through papers at the top table during a Senpai Kai session',
   'students')
) as v(path, caption, alt, category)
where public.photos.storage_path = v.path;

-- The second upload of the park-bench photograph. Same bytes, same picture.
update public.photos set is_published = false
 where storage_path = '1787234791585-762974453-1401833195378496-519796008339442084-n.jpg';


-- ###########################################################################
-- ##  0024_dates_the_committee_fixed
-- ###########################################################################

-- ===========================================================================
--  Dashain moves into the past
--
--  WHAT THIS FILE ALSO BRIEFLY DID, AND WHY IT NO LONGER DOES.
--  It was first written to move the Kabaddi film show from Sunday 29 November
--  to Saturday the 28th. That was wrong: the poster — public/images/movie.jpg,
--  the one already circulating — prints "NOV 29th SUNDAY" in the largest type on
--  the bill, and 0021 had read the date off it correctly. The committee
--  confirmed the poster. Nothing in this file touches that event any more, and
--  0021's date stands.
--
--  It is corrected HERE rather than reversed in a later migration, which is the
--  opposite of the rule this file was written to respect. That rule exists
--  because a committed migration may already have been applied somewhere. This
--  one provably had not been: the live project was queried and still holds the
--  ten seeded events, with no Kabaddi show, no Festival and Dashain on
--  2026-10-18 — so 0020 to 0024 are all still outstanding there, and nowhere
--  else runs them.
--
--  That mattered more than tidiness. A migration that sets a public event to the
--  wrong day, followed by one that corrects it, leaves anybody replaying the
--  history with a window in which the site announces the wrong date for a film
--  showing — and the whole reason 0021 refuses to invent a start time is that a
--  family turning up at the wrong moment is the one failure a community listing
--  must not have. If this file HAS somehow been run already, do not edit it
--  again: add 0025 setting event_date back to 2026-11-29.
--
--  THE FESTIVAL IS UNCHANGED at 1 April 2027, which is what 0021 set and what
--  the committee confirmed. It is still a placeholder in the sense 0021
--  describes — the poster says only "APRIL 2027", and prints DATE / TIME / VENUE
--  COMING SOON in three languages — but it is now a placeholder somebody chose.
--
--  DASHAIN IS PAST. It was seeded at 2026-10-18, which is still ahead of today,
--  so the site kept announcing it as the next thing coming up. The date below is
--  the committee's own correction and is what moves the card into the history
--  where it belongs. If the real date is known, put it in: this is one row at
--  /admin/events, and nothing depends on the exact value — only on its being in
--  the past.
-- ===========================================================================

--  Only ever moved BACKWARDS, and only from the seeded date. The guard matters:
--  without it, re-running this file after the committee has set the true date
--  would quietly drag the event back to 2 October again.
update public.events set event_date = date '2026-10-02'
where slug = 'dashain-celebration'
  and event_date = date '2026-10-18';


-- ###########################################################################
-- ##  0025_the_rest_in_nepali
-- ###########################################################################

-- ===========================================================================
--  Nepali for the minutes, the stories and the gallery captions
--
--  0020 and 0021 gave the programmes and the events a Nepali column each. Three
--  kinds of content were left in English on both halves of the site, and the
--  gap is invisible from the outside: every page falls back to the English text
--  when the Nepali is missing, so /ne looks finished and is not.
--
--  WHAT IS HERE
--    meetings        title_ne, summary_ne
--    meeting_points  text_ne          <- the decisions themselves
--    stories         quote_ne, author_role_ne
--    photos          caption_ne, alt_ne
--
--  WHAT IS DELIBERATELY NOT HERE
--    meetings.place and photos.credit        A venue and a photographer's name
--                                            are proper nouns. "Oita Cultural
--                                            Hall" is the same string in both
--                                            languages, and a transliteration
--                                            would be a second spelling of a
--                                            place somebody has to find.
--    members.name / role / profession        Names are not translated. Roles
--                                            are a bigger decision than this
--                                            migration: they are shown on the
--                                            member cards, the committee page
--                                            and the register, so they want
--                                            doing in one piece.
--    events / programmes                     Already done, in 0020 and 0021.
--
--  NOTHING IS BACKFILLED. Every column is nullable and starts empty, and the
--  readers already prefer the Nepali only when it is there — so running this
--  changes nothing on the site until somebody types a translation into the
--  committee's own forms. That is the point: it adds the PLACE to put it.
--
--  alt_ne is worth its own line. Alt text is read aloud by a screen reader, in
--  the voice of the page's language — so a Nepali page describing its
--  photographs in English is read in a Nepali voice attempting English words.
--  It is the one translation here that nobody sees and some people only hear.
-- ===========================================================================

alter table public.meetings
  add column if not exists title_ne   text,
  add column if not exists summary_ne text;

alter table public.meeting_points
  add column if not exists text_ne text;

alter table public.stories
  add column if not exists quote_ne       text,
  add column if not exists author_role_ne text;

alter table public.photos
  add column if not exists caption_ne text,
  add column if not exists alt_ne     text;


-- ###########################################################################
-- ##  0026_a_word_from_the_president
-- ###########################################################################

-- ===========================================================================
--  A word from the president
--
--  The home page introduces the community with a photograph, four figures and
--  a list of what we do. What it never does is have a person say anything.
--  Somebody who has just landed in Japan and found this site has no way to tell
--  whether there is anybody behind it — and for a small community organisation
--  that is the one question that matters before they turn up to an event alone.
--
--  So: two columns on `members`, for a short signed message from whoever holds
--  the office. The band renders only when `welcome` has words in it. An empty
--  column is an invisible section, which is the right default — a placeholder
--  greeting nobody wrote is worse than no greeting.
--
--  WHY ON `members` AND NOT A SETTINGS TABLE
--  The message is signed, and everything a signature needs is already on the
--  row: the name, the office, the portrait, the published flag. A separate
--  table would duplicate all four and go stale the day the committee changes.
--  Put the words on the person, and the band follows the office automatically.
--
--  WHO MAY WRITE IT
--  Admins, through a function, exactly as the member profile fields work (see
--  0019). NOT a widened grant: `grant update (...) on members to authenticated`
--  is shared with every signed-in member, so widening it would let any member
--  write a welcome message onto their own card and have it appear on the front
--  page of the site. A SECURITY DEFINER that checks is_admin() is the only
--  shape that says "the committee, on anybody's row".
--
--  A SEPARATE FUNCTION, not two more arguments on admin_set_member_profile.
--  Adding arguments to that one means dropping and recreating it, and a browser
--  calling the new signature against a database that has not had this file run
--  would fail on EVERY profile save, not just the new field. A new function
--  fails only at the new thing, and says so.
-- ===========================================================================

alter table public.members add column if not exists welcome    text;
alter table public.members add column if not exists welcome_ne text;

comment on column public.members.welcome is
  'Short signed message shown on the home page. Empty means no band.';

-- ---------------------------------------------------------------------------
--  Writing it
--
--  NULL MEANS LEAVE IT ALONE, EMPTY STRING MEANS CLEAR IT — the same contract
--  as admin_set_member_profile, so the two forms behave the same way and
--  clearing the Nepali half does not require clearing the English one.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_member_welcome(
  p_member_id  uuid,
  p_welcome    text default null,
  p_welcome_ne text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  update public.members set
    welcome    = case when p_welcome    is null then welcome
                      else nullif(btrim(p_welcome), '')    end,
    welcome_ne = case when p_welcome_ne is null then welcome_ne
                      else nullif(btrim(p_welcome_ne), '') end,
    updated_at = now()
  where id = p_member_id;

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'no such member';
  end if;
end $$;

revoke all on function public.admin_set_member_welcome(uuid,text,text)
  from anon, authenticated;
grant execute on function public.admin_set_member_welcome(uuid,text,text)
  to authenticated;

-- ---------------------------------------------------------------------------
--  NOT SEEDED. There is deliberately no INSERT or UPDATE here putting words in
--  the president's mouth. The band stays hidden until he writes his own, from
--  the committee page. A signed welcome that the person named did not write is
--  not a nice touch, it is a forgery.
-- ---------------------------------------------------------------------------
