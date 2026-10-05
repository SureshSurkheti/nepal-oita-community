import type { Metadata } from 'next'
import { toLocale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'
import { redirect } from 'next/navigation'
import { SignInForm } from '@/components/SignInForm'
import { DevSignIn } from '@/components/DevSignIn'
import { DEV_SIGNIN_ENABLED } from '@/lib/devSignIn'
import { getCurrentMember } from '@/lib/members'
import { createClient } from '@/lib/supabase/server'

/* Depends on who is asking, so it can never be cached or prerendered.
   This used to be inherited from the root layout's force-dynamic; the layout
   dropped it so the public pages could be served from a CDN, which means the
   viewer-specific routes have to declare it themselves. Reading cookies would
   make it dynamic anyway — saying so explicitly stops a build trying to
   prerender it, and stops a future edit quietly making it cacheable. */
export const dynamic = 'force-dynamic'

/* generateMetadata rather than a static `metadata` export: a static one cannot
   see the route params, so the Nepali sign-in page would carry an English title.
   noindex either way — this page is for members who already have the link. */
export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const lang = toLocale((await params).lang)
  return { title: getDictionary(lang).meta.signInTitle, robots: { index: false } }
}

export default async function SignInPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  /* Signed in AND linked: nothing to do here.
     Signed in but not linked is the interesting case — the form drops straight
     to the code step rather than asking for a password they have already given. */
  const member = data.user ? await getCurrentMember() : null
  if (member) redirect('/members')

  return (
    <section className="section">
      <div className="container">
        <SignInForm hasAccount={Boolean(data.user)} hasMemberCard={Boolean(member)} />
        {DEV_SIGNIN_ENABLED && <DevSignIn />}
      </div>
    </section>
  )
}
