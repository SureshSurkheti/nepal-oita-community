-- ===========================================================================
--  Which members the public may see at all
--
--  The static site showed a first row of cards and put the rest behind a
--  "members only" gate — but every name was in the HTML regardless, so the gate
--  was decoration. Here it can be real: the public read policy is narrowed to
--  the handful of members flagged as a public preview, and the rest are simply
--  not returned to an anonymous request. Nothing is hidden in the browser,
--  because nothing is sent to it.
-- ===========================================================================

alter table public.members
  add column if not exists is_public_preview boolean not null default false;

comment on column public.members.is_public_preview is
  'Shown on the public homepage. The remaining members are returned only to a '
  'signed-in member — enforced by the members_public_read policy, not by CSS.';

drop policy if exists members_public_read on public.members;
create policy members_public_read on public.members
  for select
  using (
    (is_published and is_public_preview)   -- the public preview
    or public.is_member()                  -- a verified member sees everyone
    or public.is_admin()                   -- including unpublished drafts
  );

-- The six office holders are the public face of the committee, so they are the
-- preview. Advisers and general members are not.
update public.members
   set is_public_preview = true
 where category = 'leadership'
   and role is not null
   and role not ilike '%adviser%';
