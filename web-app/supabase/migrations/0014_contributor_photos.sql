-- ===========================================================================
--  Leadership may add gallery photographs too
--
--  0013 gave the leadership team events and meeting write-ups and stopped
--  there, which left the gallery admin-only for no reason anybody could name:
--  a photograph of last Sunday's football is the least consequential thing on
--  the site, and the officers are the people who took it.
--
--  Same shape as an event, for the same reason: it arrives unpublished and a
--  committee member publishes it. A contributor cannot edit or delete it
--  afterwards, so something has to catch a photograph that turns out to be of
--  somebody who did not want to be photographed — and that is a decision for
--  the committee, not a form.
--
--  TWO barriers had to move, and it is worth knowing why there are two: the
--  `photos` ROW (a caption and a path, in Postgres) and the FILE itself (in
--  Storage, which has its own policies on storage.objects). Opening one without
--  the other gets you a row pointing at a file that was refused, or an orphan
--  file nothing references.
-- ===========================================================================

alter table public.photos
  add column if not exists submitted_by uuid references public.members(id) on delete set null;

comment on column public.photos.submitted_by is
  'Who added it. Null for photographs the committee entered directly.';

/* No update and no delete for a contributor: the photos_admin policy from 0004
   is `for all ... using (is_admin())`, and this only adds a narrower way in.
   `not is_published` is what keeps an unreviewed photograph off the gallery. */
drop policy if exists photos_contribute on public.photos;
create policy photos_contribute on public.photos
  for insert to authenticated
  with check (
    public.can_contribute()
    and not is_published
    and submitted_by in (select id from public.members where user_id = auth.uid())
  );

-- So their own upload does not appear to vanish while it waits.
drop policy if exists photos_read_own on public.photos;
create policy photos_read_own on public.photos
  for select to authenticated
  using (submitted_by in (select id from public.members where user_id = auth.uid()));

-- ---------------------------------------------------------------------------
--  The file. Inside their own folder, and nowhere else.
--
--  The committee's existing gallery files sit at the root of the bucket —
--  'dashain-gathering.jpg' and so on. Confining a contributor to
--  '<their-slug>/…' means an upload can never land on top of one of those,
--  whatever it is named. Without the folder condition, somebody uploading their
--  own 'tihar.jpg' would be refused only by `upsert: false` in the client, which
--  is a client-side promise and therefore not one.
--
--  Insert only. No update, no delete — a contributor cannot replace or remove a
--  file once it is up, which is the same rule as everything else in this tier.
-- ---------------------------------------------------------------------------
drop policy if exists "contributors add site photos in their own folder" on storage.objects;
create policy "contributors add site photos in their own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-photos'
    and public.can_contribute()
    and (storage.foldername(name))[1] =
        (select slug from public.members where user_id = auth.uid())
  );
