import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { supabaseEnv } from '@/lib/env'
import type { Member, MemberContact, MemberWithContact } from '@/lib/types'

/** The signed-in visitor's own member row, or null if they are not a member.
 *
 *  This is the single place that answers "who is this, and are they one of
 *  ours". It calls link_member_to_current_user() first, which is what claims a
 *  member row for a freshly verified phone — and which also handles the case
 *  where the committee added the number after the member first tried to sign
 *  in. */
export async function getCurrentMember(): Promise<Member | null> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  await supabase.rpc('link_member_to_current_user')

  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  return (data as Member) ?? null
}

/** Members plus, for a signed-in member only, their contact details.
 *
 *  The contacts query is issued unconditionally and simply returns nothing for
 *  the public — `anon` has no grant on that table. Nothing here decides who may
 *  see a phone number; the database does. */
export async function getMembers(): Promise<MemberWithContact[]> {
  const supabase = await createClient()

  const [memberRes, contactRes] = await Promise.all([
    supabase
      .from('members')
      .select('*')
      .eq('is_published', true)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase.from('member_contacts').select('*'),
  ])

  /* The members query failing is worth shouting about: an empty list looks
     exactly like a community with no members, and nothing on the page says
     otherwise. The contacts query is different — for the public it is SUPPOSED
     to come back with nothing, so an error there is expected and ignored. */
  if (memberRes.error) {
    throw new Error(
      `Could not load members from Supabase: ${memberRes.error.message}\n`
      + 'If this says "Invalid path", check NEXT_PUBLIC_SUPABASE_URL — it should be\n'
      + 'https://<project>.supabase.co with no /rest/v1 on the end.',
    )
  }

  const byId = new Map<string, MemberContact>(
    ((contactRes.data as MemberContact[]) ?? []).map((c) => [c.member_id, c]),
  )

  return ((memberRes.data as Member[]) ?? []).map((m) => ({ ...m, contact: byId.get(m.id) ?? null }))
}

/** Public URL for a portrait in the member-photos bucket. */
export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return `${supabaseEnv().url}/storage/v1/object/public/member-photos/${path}`
}


/** The register, with NO contact details, through a client that has no cookies.
 *
 *  WHY THIS EXISTS BESIDE getMembers(), WHICH MUST NEVER BE CACHED.
 *  getMembers() attaches each member's phone number when the viewer is entitled
 *  to see it, so its result differs per viewer and caching it would hand one
 *  member's number to the next visitor. That rule stands.
 *
 *  This one cannot have that problem, because it never asks for the contacts at
 *  all. `anon` additionally has no grant on member_contacts — checked against
 *  the live project, which answers 42501 permission denied — so there are two
 *  independent reasons the phone numbers cannot reach a cached page, only one
 *  of which is this file.
 *
 *  THE POINT IS THE HOME PAGE. It used to call getMembers(), which reads
 *  cookies, which made the whole route dynamic: `x-vercel-cache: MISS` on every
 *  request, seven database queries per view, and 2.6s to first byte on a cold
 *  start — for a page whose content is the same for everybody. With this it is
 *  prerendered and served from the edge. */
export const getPublicMembers = unstable_cache(
  async (): Promise<MemberWithContact[]> => {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('is_published', true)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Could not load members from Supabase: ${error.message}`)
    }
    /* `contact: null` rather than leaving the field off, so the shape matches
       getMembers() and PersonCard needs no second branch. Nothing renders it
       here anyway: the home page passes showContact={false}. */
    return ((data as Member[]) ?? []).map((m) => ({ ...m, contact: null }))
  },
  ['public-members'],
  { tags: ['members'], revalidate: 300 },
)
