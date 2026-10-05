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
