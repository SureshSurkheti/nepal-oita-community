-- ===========================================================================
--  The site's existing content, moved out of hand-written HTML and into the
--  database: 10 events, 6 programmes, 6 stories, 12 gallery photographs.
--
--  Extracted from static-site/*.html rather than retyped, so nothing drifts
--  from what the site says today.
--
--  Safe to re-run: every insert matches on a natural key and updates.
--
--  The licence columns on `photos` are not decoration. Several of these images
--  are CC BY-SA and the licence REQUIRES attribution — keeping credit on the row
--  is what stops a future edit quietly dropping it.
-- ===========================================================================


-- A photograph is identified by its file, so the same file must not appear
-- twice. Added here rather than in 0004 so a project that has already applied
-- 0004 picks it up — and because the upsert below needs it to exist.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'photos_storage_path_key') then
    alter table public.photos add constraint photos_storage_path_key unique (storage_path);
  end if;
end $$;

-- ---- events ----------------------------------------------------------
insert into public.events (slug, title, summary, body, event_date, start_time,
                           end_time, place, category, cost, accent, register_email)
values
  ('monthly-community-meetup', 'Monthly Community Meetup', 'The regular Sunday gathering — tea, news, and whatever anyone needs a hand with.', 'Our standing meetup, held on the second Sunday of most months. No agenda beyond seeing each other, though paperwork questions always get answered.', '2026-09-13'::date, '14:00', '17:00', 'Oita Community Centre', 'Community', 'Free for everyone', 'indigo', 'nepaloitacommunity11@gmail.com'),
  ('autumn-football-tournament', 'Autumn Football Tournament', 'Six teams, one trophy, and a great deal of shouting from the touchline.', 'The autumn tournament. Teams are mixed on the day so nobody sits out, and there is no trial to get in.', '2026-09-27'::date, '09:00', '16:00', 'Oita City sports ground', 'Sports', 'Free for members · ¥300 for guests', 'moss', 'nepaloitacommunity11@gmail.com'),
  ('dashain-celebration', 'Dashain Celebration', 'Tika, jamara and the longest lunch of the year, open to the whole prefecture.', 'The biggest date in our calendar. Elders give tika and jamara, and the kitchen runs all afternoon.', '2026-10-18'::date, '11:00', '18:00', 'Oita Cultural Hall', 'Festival', 'Free for members · ¥500 for guests', 'crimson', 'nepaloitacommunity11@gmail.com'),
  ('tihar-and-deepawali', 'Tihar and Deepawali', 'Diyo lamps, rangoli and Bhai Tika, with singing that goes on late.', 'The festival of lights. We light the hall with diyo, lay rangoli at the entrance, and mark Bhai Tika together for anyone whose family is far away.', '2026-11-08'::date, '16:00', '21:00', 'Oita Community Centre', 'Festival', 'Free for members · ¥500 for guests', 'gold', 'nepaloitacommunity11@gmail.com'),
  ('summer-volleyball-afternoon', 'Summer Volleyball Afternoon', 'The indoor season closer, played until the gymnasium threw us out.', 'Our summer sports day. Volleyball is the national sport at home and it shows.', '2026-07-19'::date, '13:00', '18:00', 'Oita City gymnasium', 'Sports', 'Free for members', 'moss', 'nepaloitacommunity11@gmail.com'),
  ('riverside-clean-up', 'Riverside Clean-up', 'A morning on the riverbank with our neighbourhood association.', 'Held with the local neighbourhood association. Being good neighbours is most of what makes the rest possible.', '2026-06-21'::date, '08:00', '11:00', 'Ono River, Oita City', 'Community', 'Free', 'indigo', 'nepaloitacommunity11@gmail.com'),
  ('nepali-language-class-open-day', 'Nepali Language Class Open Day', 'Saturday-morning classes opened up so parents could see the work.', 'The children read aloud for their parents. For families whose children were born in Japan this is the whole point of the classes.', '2026-05-17'::date, '10:00', '12:00', 'Oita Community Centre', 'Cultural', 'Free for members', 'gold', 'nepaloitacommunity11@gmail.com'),
  ('nepali-food-festival', 'Nepali Food Festival', 'Home cooking at scale, with demonstrations, tastings and recipes to take away.', 'Dal bhat, momo and sel roti cooked by member families, with recipes written out for anyone who asked.', '2026-04-05'::date, '11:00', '18:00', 'Oita Cultural Hall', 'Food', 'Free entry · food sold by the plate', 'gold', 'nepaloitacommunity11@gmail.com'),
  ('new-student-orientation', 'New Student Orientation', 'Practical briefing and mentor pairing for students arriving for the spring term.', 'Everything nobody tells you in the first month: ward office, bank, phone, part-time work rules.', '2026-03-22'::date, '14:00', '17:00', 'Oita Community Centre', 'Students', 'Free for everyone', 'indigo', 'nepaloitacommunity11@gmail.com'),
  ('holi-festival-celebration', 'Holi Festival Celebration', 'A day of colour, music and food in the park — our biggest open event of the year.', 'The festival of colours, held outdoors and open to everyone in Oita. Bring white clothes you do not mind ruining, and an appetite.', '2026-03-15'::date, '10:00', '16:00', 'Oita Park, Oita City', 'Festival', 'Free for members · ¥500 for guests', 'crimson', 'nepaloitacommunity11@gmail.com')
on conflict (slug) do update
   set title = excluded.title, summary = excluded.summary, body = excluded.body,
       event_date = excluded.event_date, start_time = excluded.start_time,
       end_time = excluded.end_time, place = excluded.place,
       category = excluded.category, cost = excluded.cost,
       accent = excluded.accent, register_email = excluded.register_email;

-- Highlights are replaced wholesale per event, so re-running cannot double them.
delete from public.event_highlights where event_id = (select id from public.events where slug = 'monthly-community-meetup');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'monthly-community-meetup'), 'Open to members and to anyone thinking of joining', 0),
  ((select id from public.events where slug = 'monthly-community-meetup'), 'Help with forms, contracts and official letters', 1),
  ((select id from public.events where slug = 'monthly-community-meetup'), 'Tea and snacks provided', 2),
  ((select id from public.events where slug = 'monthly-community-meetup'), 'Children welcome', 3);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'autumn-football-tournament');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'autumn-football-tournament'), 'Open teams, all levels, boots not compulsory', 0),
  ((select id from public.events where slug = 'autumn-football-tournament'), 'Families welcome to come and watch', 1),
  ((select id from public.events where slug = 'autumn-football-tournament'), 'Food stall run by member families', 2),
  ((select id from public.events where slug = 'autumn-football-tournament'), 'Trophy presented at the end of the day', 3);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'dashain-celebration');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'dashain-celebration'), 'Tika and jamara from the elders', 0),
  ((select id from public.events where slug = 'dashain-celebration'), 'Full Nepali lunch cooked by member families', 1),
  ((select id from public.events where slug = 'dashain-celebration'), 'Cultural performances through the afternoon', 2),
  ((select id from public.events where slug = 'dashain-celebration'), 'Open to Japanese neighbours and friends', 3),
  ((select id from public.events where slug = 'dashain-celebration'), 'Community photographer on site', 4);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'tihar-and-deepawali');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'tihar-and-deepawali'), 'Diyo lighting and rangoli at the entrance', 0),
  ((select id from public.events where slug = 'tihar-and-deepawali'), 'Bhai Tika for members without family in Japan', 1),
  ((select id from public.events where slug = 'tihar-and-deepawali'), 'Deusi and Bhailo singing', 2),
  ((select id from public.events where slug = 'tihar-and-deepawali'), 'Sel roti and sweets', 3);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'summer-volleyball-afternoon');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'summer-volleyball-afternoon'), 'Mixed teams drawn on the day', 0),
  ((select id from public.events where slug = 'summer-volleyball-afternoon'), 'Beginners very welcome', 1),
  ((select id from public.events where slug = 'summer-volleyball-afternoon'), 'Cold drinks provided', 2);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'riverside-clean-up');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'riverside-clean-up'), 'Gloves and bags provided', 0),
  ((select id from public.events where slug = 'riverside-clean-up'), 'Finished with breakfast together', 1),
  ((select id from public.events where slug = 'riverside-clean-up'), 'Joint effort with the local association', 2);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'nepali-language-class-open-day');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'nepali-language-class-open-day'), 'Reading and writing in Devanagari', 0),
  ((select id from public.events where slug = 'nepali-language-class-open-day'), 'Work from the year on display', 1),
  ((select id from public.events where slug = 'nepali-language-class-open-day'), 'Enrolment for the next term', 2);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'nepali-food-festival');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'nepali-food-festival'), 'Momo folding demonstrations', 0),
  ((select id from public.events where slug = 'nepali-food-festival'), 'Sel roti made on the day', 1),
  ((select id from public.events where slug = 'nepali-food-festival'), 'Recipes to take home', 2),
  ((select id from public.events where slug = 'nepali-food-festival'), 'Vegetarian options throughout', 3);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'new-student-orientation');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'new-student-orientation'), 'Ward office and residence card walkthrough', 0),
  ((select id from public.events where slug = 'new-student-orientation'), 'Opening a bank account', 1),
  ((select id from public.events where slug = 'new-student-orientation'), 'Part-time work rules explained', 2),
  ((select id from public.events where slug = 'new-student-orientation'), 'Paired with a mentor who has done it', 3);

delete from public.event_highlights where event_id = (select id from public.events where slug = 'holi-festival-celebration');
insert into public.event_highlights (event_id, text, position) values
  ((select id from public.events where slug = 'holi-festival-celebration'), 'Gulal colour-throwing ceremony at midday', 0),
  ((select id from public.events where slug = 'holi-festival-celebration'), 'Live Nepali music and dance', 1),
  ((select id from public.events where slug = 'holi-festival-celebration'), 'Food stalls run by member families', 2),
  ((select id from public.events where slug = 'holi-festival-celebration'), 'Activities for children', 3),
  ((select id from public.events where slug = 'holi-festival-celebration'), 'Raffle for the student support fund', 4);


-- ---- programmes ------------------------------------------------------
insert into public.programmes (slug, title, body, icon, accent, sort_order)
values
  ('cultural-festivals', 'Cultural festivals', 'Dashain, Tihar, Holi and Nepali New Year — celebrated properly, and always open to the wider Oita community.', 'star', 'crimson', 10),
  ('practical-support', 'Practical support', 'The unglamorous work: forms, phone calls, translations and knowing which office to walk into.', 'shield', 'indigo', 20),
  ('a-network-that-answers', 'A network that answers', 'Five hundred people across the prefecture, and a group chat that is awake at 2am when something goes wrong.', 'network', 'moss', 30),
  ('language-and-heritage', 'Language and heritage', 'Nepali for children growing up in Japan, and a hand with Japanese for the adults who need it for work.', 'graduate', 'gold', 40),
  ('sport-and-weekends', 'Sport and weekends', 'Football and volleyball through the warm months — the easiest way into the community if you do not know anybody yet.', 'users', 'moss', 50),
  ('landing-in-oita', 'Landing in Oita', 'The first month is the hardest. Someone who has already done it will walk you through it.', 'home', 'crimson', 60)
on conflict (slug) do update
   set title = excluded.title, body = excluded.body, icon = excluded.icon,
       accent = excluded.accent, sort_order = excluded.sort_order;

delete from public.programme_points where programme_id = (select id from public.programmes where slug = 'cultural-festivals');
insert into public.programme_points (programme_id, text, position) values
  ((select id from public.programmes where slug = 'cultural-festivals'), 'Traditional food and live music', 0),
  ((select id from public.programmes where slug = 'cultural-festivals'), 'Dance and cultural performances', 1),
  ((select id from public.programmes where slug = 'cultural-festivals'), 'Family-friendly, all welcome', 2);

delete from public.programme_points where programme_id = (select id from public.programmes where slug = 'practical-support');
insert into public.programme_points (programme_id, text, position) values
  ((select id from public.programmes where slug = 'practical-support'), 'Visa and residency paperwork', 0),
  ((select id from public.programmes where slug = 'practical-support'), 'Job placement and interviews', 1),
  ((select id from public.programmes where slug = 'practical-support'), 'Housing and guarantor guidance', 2);

delete from public.programme_points where programme_id = (select id from public.programmes where slug = 'a-network-that-answers');
insert into public.programme_points (programme_id, text, position) values
  ((select id from public.programmes where slug = 'a-network-that-answers'), 'Facebook groups for your area', 0),
  ((select id from public.programmes where slug = 'a-network-that-answers'), 'Monthly newsletter', 1),
  ((select id from public.programmes where slug = 'a-network-that-answers'), 'Emergency support chain', 2);

delete from public.programme_points where programme_id = (select id from public.programmes where slug = 'language-and-heritage');
insert into public.programme_points (programme_id, text, position) values
  ((select id from public.programmes where slug = 'language-and-heritage'), 'Nepali reading and writing for children', 0),
  ((select id from public.programmes where slug = 'language-and-heritage'), 'Conversation practice before interviews', 1),
  ((select id from public.programmes where slug = 'language-and-heritage'), 'Help reading official letters', 2);

delete from public.programme_points where programme_id = (select id from public.programmes where slug = 'sport-and-weekends');
insert into public.programme_points (programme_id, text, position) values
  ((select id from public.programmes where slug = 'sport-and-weekends'), 'Open teams, no trials, all levels', 0),
  ((select id from public.programmes where slug = 'sport-and-weekends'), 'Matches in Oita City and Beppu', 1),
  ((select id from public.programmes where slug = 'sport-and-weekends'), 'Families welcome to come and watch', 2);

delete from public.programme_points where programme_id = (select id from public.programmes where slug = 'landing-in-oita');
insert into public.programme_points (programme_id, text, position) values
  ((select id from public.programmes where slug = 'landing-in-oita'), 'Meeting new arrivals at the station', 0),
  ((select id from public.programmes where slug = 'landing-in-oita'), 'Ward office, bank and phone set-up', 1),
  ((select id from public.programmes where slug = 'landing-in-oita'), 'Where to buy Nepali groceries', 2);


-- ---- stories ---------------------------------------------------------
-- Approved: these are already on the live site. New submissions default to pending.
insert into public.stories (author_name, author_role, quote, status, sort_order)
select * from (values
  ('Rajesh Shrestha', 'Student, APU', 'I landed in Beppu with two suitcases and no idea how anything worked. Someone from this community met me at the station. Within a week I had a room, a phone plan and people to eat dinner with.', 'approved', 10),
  ('Sita Gurung', 'Working professional, Oita City', 'The first Dashain I spent here, I cried on the phone to my mother. The next one I spent in a hall in Oita with three hundred people and it felt like home. That is what this group does.', 'approved', 20),
  ('Anil Tamang', 'Factory worker, Nakatsu', 'My Japanese was not good enough to argue with my employer. Two people came with me to translate, and it was sorted the same week. I have a better job now because of them.', 'approved', 30),
  ('Sunita Magar', 'Parent, Oita City', 'My daughter was born here and I was afraid she would grow up with no Nepali at all. She reads to me now on Saturday mornings. That is entirely down to the classes.', 'approved', 40),
  ('Dipesh Bhandari', 'Student, Beppu', 'I came for the football and stayed for everything else. Turning up to a match on my second weekend in Beppu is how I met almost everyone I know in this prefecture.', 'approved', 50),
  ('Kenji Matsuda', 'Neighbour, Oita City', 'We are Japanese and we live next door to the hall. We were invited to our first Tihar four years ago and we have not missed one since. The food alone is worth it.', 'approved', 60)
) as v(author_name, author_role, quote, status, sort_order)
 where not exists (select 1 from public.stories s where s.author_name = v.author_name);


-- ---- gallery photographs --------------------------------------------
insert into public.photos (storage_path, caption, alt, category, credit,
                           credit_url, licence, licence_url, sort_order)
values
  ('dashain-gathering.jpg', 'Dashain', 'Jamara — pale barley shoots grown in the dark for Dashain', 'festivals', '南アジア', 'https://commons.wikimedia.org/wiki/User:南アジア', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0', 10),
  ('monthly-meetup.jpg', 'Monthly meetup', 'Monthly meetup', 'community', null, null, null, null, 20),
  ('traditional-dance.jpg', 'Masked dance', 'Masked Devi Nach dancers in full costume', 'cultural', 'SuyogyaRT', 'https://commons.wikimedia.org/wiki/User:SuyogyaRT', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 30),
  ('tihar.jpg', 'Tihar', 'A clay diyo lamp burning', 'festivals', 'Gaurav Dhwaj Khadka', 'https://commons.wikimedia.org/wiki/User:Gaurav_Dhwaj_Khadka', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 40),
  ('holi-in-the-park.jpg', 'Holi', 'A crowd covered in coloured powder at Holi', 'festivals', 'Bijay Chaurasia', 'https://commons.wikimedia.org/wiki/User:Bijay_Chaurasia', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 50),
  ('student-orientation.jpg', 'Student orientation', 'Student orientation', 'community', null, null, null, null, 60),
  ('food-festival.jpg', 'Dal bhat', 'A dal bhat meal served on a brass plate', 'cultural', '松岡明芳', 'https://commons.wikimedia.org/wiki/User:松岡明芳', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 70),
  ('annual-football-tournament.jpg', 'Annual football tournament', 'Annual football tournament', 'sports', null, null, null, null, 80),
  ('nepali-language-class.jpg', 'Devanagari', 'A page of Bhanubhakta''s Ramayana in Devanagari script', 'cultural', null, null, 'Public domain', null, 90),
  ('volunteer-clean-up.jpg', 'Volunteer clean-up', 'Volunteer clean-up', 'community', null, null, null, null, 100),
  ('nepali-new-year.jpg', 'Nepali New Year', 'An ornate wooden chariot in a Bhaktapur street', 'festivals', 'Nyeta', 'https://commons.wikimedia.org/wiki/User:Nyeta', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 110),
  ('volleyball-afternoon.jpg', 'Volleyball afternoon', 'Volleyball afternoon', 'sports', null, null, null, null, 120)
on conflict (storage_path) do update
   set caption = excluded.caption, alt = excluded.alt, category = excluded.category,
       credit = excluded.credit, credit_url = excluded.credit_url,
       licence = excluded.licence, licence_url = excluded.licence_url,
       sort_order = excluded.sort_order;

