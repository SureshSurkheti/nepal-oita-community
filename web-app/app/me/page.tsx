import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/ProfileForm'
import { getCurrentMember, photoUrl } from '@/lib/members'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'My profile', robots: { index: false } }

export default async function MyProfilePage() {
  const member = await getCurrentMember()
  if (!member) redirect('/sign-in')

  const supabase = await createClient()
  const { data: contact } = await supabase
    .from('member_contacts')
    .select('*')
    .eq('member_id', member.id)
    .maybeSingle()

  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">Members only</p>
          <h1 className="display-2">My profile</h1>
          <p className="lede">
            Your name and role are the committee&rsquo;s to set. Your photo,
            profession and Facebook link are yours.
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
