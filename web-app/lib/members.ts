import { createClient } from '@/lib/supabase/server'
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
