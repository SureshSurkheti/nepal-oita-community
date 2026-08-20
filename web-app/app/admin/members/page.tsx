import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Icon } from '@/components/Sprite'
import { AdminMemberTable } from '@/components/AdminMemberTable'
import { AddMemberForm } from '@/components/AddMemberForm'
import { getCurrentMember } from '@/lib/members'
import { createClient } from '@/lib/supabase/server'
import type { Member, MemberContact } from '@/lib/types'

export const metadata: Metadata = { title: 'Committee — members', robots: { index: false } }

export default async function AdminMembersPage() {
  const me = await getCurrentMember()
  if (!me) redirect('/sign-in')

  /* A redirect for anyone who is not on the committee. Note this is for their
     benefit, not for security: an admin's queries below are authorised by the
     database, so a non-admin who reached this page anyway would simply be shown
     nothing. The guard is the RLS policy; this is the signpost. */
  if (!me.is_admin) redirect('/members')

  const supabase = await createClient()
  const [{ data: members }, { data: contacts }, { data: codes }] = await Promise.all([
    supabase.from('members').select('*')
      .order('category').order('sort_order').order('name'),
    supabase.from('member_contacts').select('*'),
    /* Through the function, not the table: member_claim_codes has no grant for
       any role, so the only way in is a SECURITY DEFINER that checks is_admin()
       itself. It returns the latest code per member and never the code. */
    supabase.rpc('admin_claim_code_status'),
  ])

  const contactById = new Map<string, MemberContact>(
    ((contacts as MemberContact[]) ?? []).map((c) => [c.member_id, c]),
  )
  const codeById = new Map<string, { issued_at: string; used_at: string | null }>(
    ((codes as { member_id: string; issued_at: string; used_at: string | null }[]) ?? [])
      .map((c) => [c.member_id, { issued_at: c.issued_at, used_at: c.used_at }]),
  )
  const rows = ((members as Member[]) ?? []).map((m) => ({
    member: m,
    contact: contactById.get(m.id) ?? null,
    code: codeById.get(m.id) ?? null,
  }))

  /* Who cannot get in. It used to be "who has no phone number", which stopped
     being the answer when sign-in became an email address and a password: a
     member is now locked out by having no membership code, not by having no
     number on file. */
  const needCode = rows.filter((r) => !r.member.user_id && !(r.code && !r.code.used_at)).length

  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">Committee only</p>
          <h1 className="display-2">The member register</h1>
          <p className="lede">
            A member makes their own account with an email address and a password.
            What connects it to their card is a one-time code you issue here.
            Nothing on this page is visible to anyone outside the committee.
          </p>
        </div>

        {needCode > 0 && (
          <div className="panel panel--ink reveal">
            <h2 className="panel__title">
              <Icon name="shield" /> {needCode} cannot claim their card yet
            </h2>
            <p>
              They are on the register and on the public page, but with no code
              outstanding there is no way for them to prove the card is theirs — so
              they cannot add their own photo, profession or links.
            </p>
          </div>
        )}

        <AddMemberForm />
        <AdminMemberTable rows={rows} currentId={me.id} />
      </div>
    </section>
  )
}
