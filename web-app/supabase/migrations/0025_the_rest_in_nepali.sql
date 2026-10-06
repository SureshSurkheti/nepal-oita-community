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
