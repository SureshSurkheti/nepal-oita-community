-- ===========================================================================
--  Did the setup take? Paste this into the SQL editor and read the rows.
--
--  "Success. No rows returned" from setup.sql only means nothing errored — it
--  says nothing about what landed. This does.
-- ===========================================================================

with checks as (

  select 1 as ord, 'members seeded' as what,
         count(*)::text || ' of 28' as found,
         count(*) = 28 as ok
    from public.members

  union all
  select 2, 'contact rows (all empty for now)',
         count(*)::text || ' of 28', count(*) = 28
    from public.member_contacts

  union all
  select 3, 'public preview (6 office holders + 5 of the register)',
         count(*)::text || ' of 11', count(*) = 11
    from public.members where is_public_preview

  union all
  select 4, 'phone numbers stored',
         count(*)::text || ' (expected 0 until you add them)', count(*) = 0
    from public.member_contacts where phone_e164 is not null

  union all
  select 5, 'committee admins',
         count(*)::text || ' (0 until you run 0006_first_admin.sql)', true
    from public.members where is_admin

  union all
  select 6, 'row-level security switched on',
         count(*)::text || ' of 8 tables', count(*) = 8
    from pg_tables
   where schemaname = 'public' and rowsecurity
     and tablename in ('members','member_contacts','events','event_highlights',
                       'programmes','programme_points','stories','photos')

  union all
  select 7, 'policies created',
         count(*)::text || ' (expect 15 or more)', count(*) >= 15
    from pg_policies where schemaname = 'public'

  union all
  select 8, 'the public CANNOT read contacts',
         case when has_table_privilege('anon','public.member_contacts','select')
              then 'anon CAN read them — WRONG' else 'confirmed' end,
         not has_table_privilege('anon','public.member_contacts','select')

  union all
  -- The exact set, not the size of it. A count passes just as happily when one
  -- column has been swapped for another, and the column that would matter is
  -- is_admin.
  select 9, 'a member can only write these columns of members',
         coalesce(string_agg(column_name, ', ' order by column_name), 'none'),
         coalesce(string_agg(column_name, ',' order by column_name), '')
           = 'facebook_url,instagram_url,photo_path,profession,tiktok_url,updated_at'
    from information_schema.column_privileges
   where grantee = 'authenticated' and table_name = 'members'
     and privilege_type = 'UPDATE'

  union all
  select 10, 'storage buckets',
         coalesce(string_agg(id, ', ' order by id), 'none'), count(*) = 2
    from storage.buckets where id in ('member-photos','site-photos')

  union all
  select 11, 'functions installed',
         count(*)::text || ' of 9', count(*) = 9
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('link_member_to_current_user','is_admin','is_member',
                       'initials_for','admin_upsert_member','admin_set_member_contact',
                       'admin_delete_member','admin_set_admin','admin_set_story_status')

  -- The four blocks a visitor sees on the homepage. Each was 0 for a while
  -- because 0008_seed_content.sql had not been applied, and the site rendered
  -- that as "this community has no events" rather than as an error. Count them
  -- here so an empty database is never mistaken for an empty community.
  union all
  select 12, 'events seeded', count(*)::text || ' of 10', count(*) = 10
    from public.events

  union all
  select 13, 'event highlights', count(*)::text || ' of 39', count(*) = 39
    from public.event_highlights

  union all
  select 14, 'programmes seeded', count(*)::text || ' of 6', count(*) = 6
    from public.programmes

  union all
  select 15, 'programme points', count(*)::text || ' of 18', count(*) = 18
    from public.programme_points

  union all
  select 16, 'stories approved and showing',
         count(*)::text || ' of 6', count(*) = 6
    from public.stories where status = 'approved'

  union all
  select 17, 'gallery photo rows', count(*)::text || ' of 12', count(*) = 12
    from public.photos

  -- Rows are not pictures. The rows name files in the site-photos bucket and
  -- nothing uploads them for you, so a full gallery table with an empty bucket
  -- renders twelve blank tiles. This is the check that catches that.
  union all
  select 18, 'gallery files actually uploaded',
         count(*)::text || ' of 12 (upload them at /admin/photos)', count(*) = 12
    from storage.objects where bucket_id = 'site-photos'

  union all
  select 19, 'contact form table', count(*)::text || ' messages so far', true
    from public.messages

  union all
  select 20, 'RLS on the new tables',
         count(*)::text || ' of 3 (claim codes, meetings, points)', count(*) = 3
    from pg_tables
   where schemaname = 'public' and rowsecurity
     and tablename in ('member_claim_codes', 'meetings', 'meeting_points')

  -- The claim code table must have NO grant to either role. Everything goes
  -- through two SECURITY DEFINER functions; a stray grant here would let any
  -- signed-in account read which cards have an outstanding code.
  union all
  select 21, 'nobody can read the claim codes directly',
         case when count(*) = 0 then 'confirmed'
              else count(*)::text || ' privilege(s) granted — WRONG' end,
         count(*) = 0
    from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'member_claim_codes'
     and grantee in ('anon', 'authenticated')

  union all
  select 22, 'members who cannot claim their card yet',
         count(*)::text || ' (issue codes at /admin/members)', true
    from public.members m
   where m.user_id is null
     and not exists (select 1 from public.member_claim_codes c
                      where c.member_id = m.id and c.used_at is null)

  union all
  select 23, 'meeting decisions published',
         count(*)::text || ' approved', true
    from public.meetings where status = 'approved'

  union all
  select 24, 'who may add events and meeting write-ups',
         (select count(*)::text from public.members where can_contribute and not is_admin)
           || ' leadership + '
           || (select count(*)::text from public.members where is_admin)
           || ' committee',
         true

  -- The three tiers only mean anything if the middle one cannot promote itself.
  -- These are the columns that separate them, and neither may be in the grant.
  union all
  select 25, 'a member cannot grant themselves a tier',
         case when count(*) = 0 then 'confirmed'
              else 'WRONG — ' || string_agg(column_name, ', ') end,
         count(*) = 0
    from information_schema.column_privileges
   where grantee = 'authenticated' and table_name = 'members'
     and privilege_type = 'UPDATE'
     and column_name in ('is_admin', 'can_contribute', 'user_id', 'role', 'category')

  union all
  select 26, 'waiting for the committee to publish',
         (select count(*)::text from public.events where not is_published) || ' event(s), '
           || (select count(*)::text from public.photos where not is_published)
           || ' photograph(s)',
         true

  -- Last, and the one to read before publishing. While dev_sign_in_as exists,
  -- anybody who can reach the site can sign in as any member and read every
  -- stored phone number. It is meant to be here during development and must not
  -- survive it — so this reports it as a fault, not as information.
  union all
  select 27, 'development sign-in bypass',
         case when count(*) > 0
              then 'INSTALLED — run supabase/dev/dev_signin_remove.sql before launch'
              else 'not installed' end,
         count(*) = 0
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'dev_sign_in_as'
)
select case when ok then 'ok' else 'CHECK THIS' end as status,
       what, found
  from checks
 order by ord;
