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
