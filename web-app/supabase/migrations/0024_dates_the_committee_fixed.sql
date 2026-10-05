-- ===========================================================================
--  Three dates the committee settled, after 0021 was written
--
--  A SEPARATE MIGRATION RATHER THAN AN EDIT TO 0021. 0021 has not been run on
--  the live project yet, so editing it in place would have worked there — but it
--  is committed, and anybody who has already run it (a local copy, a staging
--  project, a future restore from an older dump) would silently keep the old
--  dates for ever. Append-only is the only rule that holds in every one of those
--  cases, and the cost here is one small file.
--
--  1. THE FILM SHOW MOVES TO SATURDAY 28 NOVEMBER 2026, from Sunday the 29th.
--     The weekday moves with it, which is the part that is easy to miss: the
--     write-up names the day in both languages, so changing only event_date
--     would leave a card reading SAT 28 above a paragraph saying Sunday. Both
--     are updated here, and 28 November 2026 is a Saturday — checked, not
--     assumed.
--
--  2. THE FESTIVAL STAYS AT 1 APRIL 2027, which is what the committee asked for
--     and what 0021 already set. Nothing to change; it is written down here so
--     the next person does not go looking for the statement that moved it.
--     It is STILL A PLACEHOLDER in the sense 0021 describes — the poster says
--     only "April 2027" — but it is now a placeholder the committee has chosen.
--
--  3. DASHAIN IS PAST. It was seeded at 2026-10-18, which is still ahead of
--     today, so the site kept announcing it as the next thing coming up. The
--     date below is the committee's own correction and is what makes the card
--     move into the history where it belongs.
--
--     IF THE REAL DATE IS KNOWN, PUT IT IN. This is one row at /admin/events and
--     nothing here depends on the exact value — only on its being in the past.
-- ===========================================================================

-- --------------------------------------------------- 1. the Kabaddi film show
update public.events set
  event_date = date '2026-11-28',
  body = replace(body, 'Sunday 29 November', 'Saturday 28 November'),
  body_ne = replace(body_ne, 'नोभेम्बर २९, आइतबार', 'नोभेम्बर २८, शनिबार')
where slug = 'kabaddi-5-oita-show';

-- ------------------------------------------------------------- 3. Dashain
--  Only ever moved BACKWARDS, and only from the seeded date. The guard matters:
--  without it, re-running this file after the committee has set the true date
--  would quietly drag the event back to 2 October again.
update public.events set event_date = date '2026-10-02'
where slug = 'dashain-celebration'
  and event_date = date '2026-10-18';
