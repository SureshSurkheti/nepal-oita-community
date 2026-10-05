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
