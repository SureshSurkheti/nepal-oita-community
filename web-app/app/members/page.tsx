import Link from 'next/link'
import type { Metadata } from 'next'
import { Icon } from '@/components/Sprite'
import { PersonCard } from '@/components/PersonCard'
import { getCurrentMember, getMembers } from '@/lib/members'
import { PageHead } from '@/components/PageHead'

export const metadata: Metadata = {
  alternates: { canonical: '/members' },
  title: 'Members',
  description:
    'The leadership team and general members of the Nepal–Oita Community. '
    + 'Contact details are returned only to verified members.',
  // Everyone here is a named private individual, and a page that is nothing but
  // a list of them should not become the top result for somebody's name.
  robots: { index: false, follow: true },
}


export default async function MembersPage() {
  const [member, members] = await Promise.all([getCurrentMember(), getMembers()])
  const signedIn = member !== null

  const leadership = members.filter((m) => m.category === 'leadership')
  const general = members.filter((m) => m.category === 'general')

  return (
    <>
      <PageHead icon="users" eyebrow="Members" title="The people of Nepal–Oita"
                back={{ href: '/#members', label: 'Back to members' }}
                lede={signedIn
                  ? 'Signed in — you are seeing the register with contact details.'
                  : 'The whole committee and the whole register. Phone numbers are '
                    + 'shown to verified members only.'} />

      <section className="section">
        <div className="container">
          {signedIn ? (
            <div className="members-bar">
              <p className="text-sm muted">
                Signed in as <strong>{member.name}</strong>
                {member.is_admin && ' · committee'}
              </p>
              <div className="cluster">
                <Link className="chip" href="/me">Edit my card</Link>
                {member.is_admin && <Link className="chip" href="/admin/members">Committee tools</Link>}
              </div>
            </div>
          ) : (
            /* No longer a gate over the list — every published member is public
               now. What is left behind it is the phone numbers, which the
               database does not return to an unverified request at all. So this
               is an invitation, not a barrier: there is nothing below it that
               signing in would reveal except the ways to reach people. */
            <div className="members-bar">
              <p className="text-sm muted">
                Phone numbers are shown to verified members.
              </p>
              <div className="cluster">
                <Link className="chip" href="/sign-in">Sign in</Link>
              </div>
            </div>
          )}

          {leadership.length > 0 && (
            <>
              <div className="section-head mt-lg reveal">
                <p className="eyebrow">
                  <span className="eyebrow__badge"><Icon name="shield" /></span>
                  Office holders and advisers
                </p>
                <h2 className="display-2" id="leadership">Leadership team</h2>
              </div>
              <div className="people-flow">
                {leadership.map((m, i) => (
                  <PersonCard key={m.id} member={m} index={i} showContact={signedIn} />
                ))}
              </div>
            </>
          )}

          {general.length > 0 && (
            <>
              <div className="section-head mt-xl reveal">
                <p className="eyebrow">
                  <span className="eyebrow__badge"><Icon name="users" /></span>
                  Everybody else on the register
                </p>
                <h2 className="display-2" id="general-members">General members</h2>
              </div>
              <div className="grid grid--five grid--people">
                {general.map((m, i) => (
                  <PersonCard key={m.id} member={m} index={i} showContact={signedIn} />
                ))}
              </div>
            </>
          )}

          {general.length === 0 && (
            <p className="muted mt-lg">
              No general members on the register yet — the committee can add them
              under Committee tools.
            </p>
          )}
        </div>
      </section>
    </>
  )
}
