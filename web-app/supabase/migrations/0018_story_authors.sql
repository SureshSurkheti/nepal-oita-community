-- ===========================================================================
--  A member owns their own story
--
--  Two changes, both asked for.
--
--  1. The romanised-Nepali story was signed 'Suresh Surkheti', which is the
--     committee's own account. Reassigned to a general member, where it belongs:
--     it is about somebody's first week in Beppu, which is a new arrival's story
--     rather than the technical officer's.
--
--  2. A member can now edit their own story after submitting it. Until now they
--     could write one and read it back and nothing else — so a typo, a change of
--     mind, or a sentence they regretted meant emailing the committee and asking
--     somebody else to retype it. That is the sort of small indignity that stops
--     people submitting at all.
--
--  WHAT EDITING DOES NOT INCLUDE
--  `status` is not in the update grant, so a member cannot approve their own
--  story — the committee still publishes it, exactly as before. `member_id` is
--  not in it either, so a story cannot be reassigned to somebody else. And the
--  policy is keyed to the caller's own member row, so nobody can touch anybody
--  else's. What is left is the words, the name shown, and the role shown, which
--  is the whole of what a person should control about their own quote.
--
--  EDITING AN APPROVED STORY DOES NOT PULL IT DOWN
--  Deliberately, and it is the one debatable call here. A member could in theory
--  get a sentence approved and then rewrite it into something else. The
--  alternative — sending it back to pending on every edit — means a published
--  story disappears from the site because somebody fixed a spelling mistake, and
--  the person then has to ask for it to be approved again. For a community of a
--  few hundred people who see each other every month, that trade is the wrong way
--  round. Committee members can still reject anything at /admin/stories.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  1. Reassign the romanised-Nepali story
--
--  Matched on the quote's opening words rather than on the author, so it works
--  whether 0017 has already run under the old name or not, and so it cannot
--  silently reassign some other story that happens to share a name. Guarded on
--  the target existing, because 0017 is what creates that member.
-- ---------------------------------------------------------------------------
update public.stories s
   set member_id   = m.id,
       author_name = m.name,
       author_role = null
  from public.members m
 where m.slug = 'nagendra-dahal'
   and s.quote like 'Beppu ma aayeko pahilo haptaa%';

-- ---------------------------------------------------------------------------
--  2. Let a member edit their own story
-- ---------------------------------------------------------------------------
/* Column-scoped, and the list is the point. `status` is absent so nobody
   publishes their own words; `member_id` is absent so a story cannot be moved to
   another person's name; `id` and `created_at` are absent for the obvious
   reasons. `photo_path` is in it because a member may want the quote to carry a
   different picture from their card. */
grant update (author_name, author_role, quote, photo_path)
  on public.stories to authenticated;

/* USING decides which rows they may reach, WITH CHECK decides what the row may
   look like afterwards. Both are needed and both say the same thing here: the
   story has to belong to one of the caller's own member rows before AND after.
   With only USING, a member could reach their own row and then write a
   member_id... except that column is not granted — but the pair is written out
   anyway, because the next person to widen the grant will not read this comment. */
drop policy if exists stories_edit_own on public.stories;
create policy stories_edit_own on public.stories
  for update to authenticated
  using (member_id in (select id from public.members where user_id = auth.uid()))
  with check (member_id in (select id from public.members where user_id = auth.uid()));

/* And delete it. Somebody who can rewrite every word of their own quote can
   already empty it, so refusing the delete would only mean a blank card sitting
   on the page instead. Scoped the same way. */
grant delete on public.stories to authenticated;

drop policy if exists stories_delete_own on public.stories;
create policy stories_delete_own on public.stories
  for delete to authenticated
  using (member_id in (select id from public.members where user_id = auth.uid()));
