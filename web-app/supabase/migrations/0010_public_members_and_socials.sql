-- ===========================================================================
--  Two changes to what the public sees of a member
--
--  1. EVERY published member is now public — the whole leadership team and the
--     whole general register, not the eleven-card preview.
--
--     Be clear about what that means, because it cannot be undone for anybody
--     who has already been indexed: a name on this list is on the open web. The
--     committee asked for it, and it matches what the old hand-written site did.
--     What has NOT changed is the line that actually matters: phone numbers and
--     email addresses stay in member_contacts, where `anon` holds no grant at
--     all, so there is nothing there for an anonymous request to read.
--
--  2. Social links move onto `members`, which is publicly readable, and a member
--     may edit their own.
--
--     facebook_url used to live on member_contacts alongside the phone number.
--     That was the right place while it was private and the wrong place now:
--     a Facebook or Instagram handle is already public wherever it points, and
--     keeping it in the private table meant the only way to show it was to open
--     that table up — which would have taken the phone numbers with it.
--     Splitting them is the whole point.
-- ===========================================================================

alter table public.members
  add column if not exists facebook_url  text,
  add column if not exists instagram_url text,
  add column if not exists tiktok_url    text;

comment on column public.members.facebook_url is
  'Public. Private contact details stay in member_contacts, which anon cannot read.';

-- Carry across anything already entered, then stop using the old column. It is
-- left in place rather than dropped: dropping it would throw away data if this
-- migration is applied to a database where somebody has filled it in and the
-- copy below has already run once.
update public.members m
   set facebook_url = c.facebook_url
  from public.member_contacts c
 where c.member_id = m.id
   and m.facebook_url is null
   and c.facebook_url is not null;

comment on column public.member_contacts.facebook_url is
  'SUPERSEDED by members.facebook_url, which is public. Kept so no data is lost.';

-- ---------------------------------------------------------------------------
--  Read: everyone published, to everyone.
-- ---------------------------------------------------------------------------
drop policy if exists members_public_read on public.members;
create policy members_public_read on public.members
  for select
  using (is_published or public.is_admin());

comment on column public.members.is_public_preview is
  'NO LONGER CONSULTED by members_public_read — every published member is public '
  'now. Kept because the homepage still uses it to choose which cards to show '
  'above the "see all" control, which is a layout question, not a privacy one.';

-- ---------------------------------------------------------------------------
--  Write: the member's own card, and only these columns.
--
--  Re-granting from scratch rather than adding to the existing grant, so the
--  full list is visible in one place. Still absent, and deliberately: user_id,
--  slug, name, role, category, is_admin, is_published, is_public_preview.
-- ---------------------------------------------------------------------------
revoke update on public.members from authenticated;
grant update (profession, photo_path, facebook_url, instagram_url, tiktok_url,
              updated_at)
  on public.members to authenticated;
