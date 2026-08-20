-- ===========================================================================
--  Row-level security, and column-level grants
--
--  These are two different mechanisms doing two different jobs, and the members
--  table needs both:
--
--    RLS decides WHICH ROWS you may touch.        (your own card)
--    GRANTs decide WHICH COLUMNS you may write.   (your profession, not your title)
--
--  RLS alone is not enough. A policy of `using (user_id = auth.uid())` on an
--  UPDATE lets a member change *any* column of their own row — including
--  `role`, so anyone could promote themselves to President, or `is_admin`, so
--  anyone could make themselves a committee admin. The column grants are what
--  stop that, and they are the reason the admin path below goes through
--  functions rather than through a wider grant.
-- ===========================================================================

alter table public.members         enable row level security;
alter table public.member_contacts enable row level security;

-- ---------------------------------------------------------------------------
--  members
-- ---------------------------------------------------------------------------

-- Start from nothing, so anything not named below is denied.
revoke all on public.members from anon, authenticated;

grant select on public.members to anon, authenticated;

-- The only three columns a member may ever write on their own card. Note what
-- is absent: user_id, slug, name, role, category, is_admin, is_published.
grant update (profession, photo_path, updated_at) on public.members to authenticated;

drop policy if exists members_public_read on public.members;
create policy members_public_read on public.members
  for select
  using (is_published or public.is_admin());

drop policy if exists members_update_own on public.members;
create policy members_update_own on public.members
  for update
  to authenticated
  using      (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
--  member_contacts — anon gets no grant at all, so there is nothing to leak
-- ---------------------------------------------------------------------------

revoke all on public.member_contacts from anon, authenticated;

grant select on public.member_contacts to authenticated;
grant update (facebook_url, email, updated_at) on public.member_contacts to authenticated;

-- Signed in is not sufficient: anyone at all can obtain an authenticated
-- session by verifying any phone they control. What opens the directory is
-- being linked to a member row, which only a registered number can do.
drop policy if exists contacts_read_members_only on public.member_contacts;
create policy contacts_read_members_only on public.member_contacts
  for select
  to authenticated
  using (public.is_member());

drop policy if exists contacts_update_own on public.member_contacts;
create policy contacts_update_own on public.member_contacts
  for update
  to authenticated
  using      (member_id in (select id from public.members where user_id = auth.uid()))
  with check (member_id in (select id from public.members where user_id = auth.uid()));

-- ---------------------------------------------------------------------------
--  The committee's own writes
--
--  Through SECURITY DEFINER functions rather than a broader grant. If admins
--  were handled with `grant update on public.members to authenticated` plus an
--  is_admin() policy, that wider grant would also apply to ordinary members —
--  the column restriction above would be gone, and every member could edit
--  their own role and is_admin flag. Grants are per role, not per policy, so
--  there is no way to widen them for admins alone.
--
--  Doing it here also means the app never needs the service-role key, so the
--  key that bypasses all of this does not have to exist in the deployment.
-- ---------------------------------------------------------------------------

create or replace function public.admin_upsert_member(
  p_id         uuid,
  p_slug       text,
  p_name       text,
  p_role       text,
  p_profession text,
  p_category   text,
  p_sort_order integer,
  p_published  boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.members (slug, name, role, profession, category, sort_order,
                                is_published, initials)
    values (p_slug, p_name, nullif(p_role,''), nullif(p_profession,''), p_category,
            coalesce(p_sort_order, 100), coalesce(p_published, true),
            public.initials_for(p_name))
    returning id into v_id;
  else
    update public.members
       set slug         = p_slug,
           name         = p_name,
           role         = nullif(p_role,''),
           profession   = nullif(p_profession,''),
           category     = p_category,
           sort_order   = coalesce(p_sort_order, sort_order),
           is_published = coalesce(p_published, is_published),
           initials     = public.initials_for(p_name)
     where id = p_id
    returning id into v_id;
  end if;

  return v_id;
end $$;

-- Initials for the avatar when no photo has been supplied: "Ganga Bahadur
-- Tamang" gives GT, "Member A" gives MA, a single name gives its first letter.
create or replace function public.initials_for(p_name text)
returns text
language sql
immutable
as $$
  select case
    when p_name is null or btrim(p_name) = '' then '?'
    when array_length(regexp_split_to_array(btrim(p_name), '\s+'), 1) = 1
      then upper(substr(btrim(p_name), 1, 1))
    else upper(substr((regexp_split_to_array(btrim(p_name), '\s+'))[1], 1, 1))
       || upper(substr((regexp_split_to_array(btrim(p_name), '\s+'))
                       [array_length(regexp_split_to_array(btrim(p_name), '\s+'), 1)], 1, 1))
  end;
$$;

create or replace function public.admin_set_member_contact(
  p_member_id uuid,
  p_phone     text,      -- E.164 with the plus, or null to clear
  p_facebook  text,
  p_email     text,
  p_note      text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  insert into public.member_contacts (member_id, phone_e164, facebook_url, email, note)
  values (p_member_id, nullif(p_phone,''), nullif(p_facebook,''),
          nullif(p_email,''), nullif(p_note,''))
  on conflict (member_id) do update
    set phone_e164   = excluded.phone_e164,
        facebook_url = excluded.facebook_url,
        email        = excluded.email,
        note         = excluded.note,
        updated_at   = now();
end $$;

create or replace function public.admin_delete_member(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  -- Guard against the last admin deleting themselves and locking everybody out.
  if (select is_admin from public.members where id = p_id)
     and (select count(*) from public.members where is_admin) <= 1 then
    raise exception 'that is the only admin left' using errcode = '23514';
  end if;
  delete from public.members where id = p_id;
end $$;

create or replace function public.admin_set_admin(p_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  if not p_is_admin
     and (select count(*) from public.members where is_admin) <= 1
     and (select is_admin from public.members where id = p_id) then
    raise exception 'that is the only admin left' using errcode = '23514';
  end if;
  update public.members set is_admin = p_is_admin where id = p_id;
end $$;

revoke all on function public.admin_upsert_member(uuid,text,text,text,text,text,integer,boolean) from anon;
revoke all on function public.admin_set_member_contact(uuid,text,text,text,text) from anon;
revoke all on function public.admin_delete_member(uuid) from anon;
revoke all on function public.admin_set_admin(uuid,boolean) from anon;
revoke all on function public.link_member_to_current_user() from anon;
