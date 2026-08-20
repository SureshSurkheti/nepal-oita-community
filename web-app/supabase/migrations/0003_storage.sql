-- ===========================================================================
--  Storage buckets
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('member-photos', 'member-photos', true, 5242880,
   array['image/jpeg','image/png','image/webp']),
  ('site-photos',   'site-photos',   true, 10485760,
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
--  member-photos: a member writes only inside their own folder
--
--  The path convention is <member-slug>/<something>.jpg, and the policy
--  compares the first folder segment against the slug of the member row linked
--  to the caller. So the check is not "are you signed in" but "is this folder
--  yours" — uploading over somebody else's portrait is refused by the storage
--  layer itself, whatever the app happens to send.
--
--  The file size limit and mime list on the bucket above are enforced by
--  Storage, not by the browser. The client-side resize is there to save the
--  member's data allowance, not to keep anything out.
-- ---------------------------------------------------------------------------

drop policy if exists "member photos are public to read" on storage.objects;
create policy "member photos are public to read" on storage.objects
  for select using (bucket_id in ('member-photos', 'site-photos'));

drop policy if exists "members write their own folder" on storage.objects;
create policy "members write their own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and (storage.foldername(name))[1] =
        (select slug from public.members where user_id = auth.uid())
  );

drop policy if exists "members replace their own folder" on storage.objects;
create policy "members replace their own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'member-photos'
    and (storage.foldername(name))[1] =
        (select slug from public.members where user_id = auth.uid())
  );

drop policy if exists "members delete their own folder" on storage.objects;
create policy "members delete their own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'member-photos'
    and (storage.foldername(name))[1] =
        (select slug from public.members where user_id = auth.uid())
  );

-- Committee photographs — gallery, event covers. Admins only.
drop policy if exists "admins manage site photos" on storage.objects;
create policy "admins manage site photos" on storage.objects
  for all to authenticated
  using      (bucket_id = 'site-photos' and public.is_admin())
  with check (bucket_id = 'site-photos' and public.is_admin());
