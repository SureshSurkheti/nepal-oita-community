import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Icon } from '@/components/Sprite'
import { ProfileForm } from '@/components/ProfileForm'
import { getCurrentMember, photoUrl } from '@/lib/members'

export const metadata: Metadata = { title: 'My profile', robots: { index: false } }

export default async function MyProfilePage() {
  const member = await getCurrentMember()
  if (!member) redirect('/sign-in')

  /* No contact query any more. It existed to read facebook_url out of
     member_contacts, which 0010 moved onto `members` so it could be shown
     publicly — so the form gets everything it needs from `member`, and the
     private table is not touched by this page at all. */

  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">
            <span className="eyebrow__badge"><Icon name="user" /></span>
            Members only
          </p>
          <h1 className="display-2">My profile</h1>
          <p className="lede">
            Your name and role are the committee&rsquo;s to set. Your photo,
            profession and your social links are yours.
          </p>
        </div>

        <ProfileForm
          member={member}
          currentPhotoUrl={photoUrl(member.photo_path)}
        />
      </div>
    </section>
  )
}
