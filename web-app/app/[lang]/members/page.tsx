import { LocaleLink as Link } from '@/components/LocaleLink'
import type { Metadata } from 'next'
import { Icon } from '@/components/Sprite'
import { PersonCard } from '@/components/PersonCard'
import { getCurrentMember, getMembers } from '@/lib/members'
import { PageHead } from '@/components/PageHead'
import { localeAlternates, toLocale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'

/* Depends on who is asking, so it can never be cached or prerendered.
   This used to be inherited from the root layout's force-dynamic; the layout
   dropped it so the public pages could be served from a CDN, which means the
   viewer-specific routes have to declare it themselves. Reading cookies would
   make it dynamic anyway — saying so explicitly stops a build trying to
   prerender it, and stops a future edit quietly making it cacheable. */
export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const lang = toLocale((await params).lang)
  return {
    alternates: localeAlternates(lang, '/members'),
    title: getDictionary(lang).meta.membersTitle,
    description: getDictionary(lang).meta.membersDesc,
    // Everyone here is a named private individual, and a page that is nothing but
    // a list of them should not become the top result for somebody's name.
    robots: { index: false, follow: true },
  }
}


export default async function MembersPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = toLocale((await params).lang)
  const t = getDictionary(lang)

  const [member, members] = await Promise.all([getCurrentMember(), getMembers()])
  const signedIn = member !== null

  const leadership = members.filter((m) => m.category === 'leadership')
  const general = members.filter((m) => m.category === 'general')

  return (
    <>
      <PageHead icon="users" eyebrow={t.pages.members.eyebrow} title={t.pages.members.title}
                back={{ href: '/#members', label: t.pages.members.back }}
                lede={signedIn
                  ? t.pages.members.ledeIn
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
                <Link className="chip" href="/me">{t.pages.members.editMine}</Link>
                {member.is_admin && <Link className="chip" href="/admin/members">{t.pages.members.committeeTools}</Link>}
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
                <Link className="chip" href="/sign-in">{t.nav.signIn}</Link>
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
                <h2 className="display-2" id="leadership">{t.pages.members.leadership}</h2>
              </div>
              <div className="people-flow reveal">
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
                <h2 className="display-2" id="general-members">{t.pages.members.general}</h2>
              </div>
              {/* people-flow, matching the leadership block above — see the
                  note on the home page. A short final row centres instead of
                  hanging off the left edge. */}
              <div className="people-flow reveal">
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
