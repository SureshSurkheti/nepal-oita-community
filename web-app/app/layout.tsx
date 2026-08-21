import type { Metadata } from 'next'
import './theme.css'
import { Sprite } from '@/components/Sprite'
import { SiteMotion } from '@/components/SiteMotion'
import { Nav } from '@/components/Nav'
import { SetupBanner } from '@/components/SetupBanner'
import { Footer } from '@/components/Footer'
import { DecisionsNotice } from '@/components/DecisionsNotice'
import { BackButton } from '@/components/BackButton'
import { getCurrentMember } from '@/lib/members'
import { getMeetings, longDate } from '@/lib/content'

export const metadata: Metadata = {
  title: {
    default: 'Nepal–Oita Community',
    template: '%s | Nepal–Oita Community',
  },
  description:
    'The Nepali community of Oita Prefecture, Japan — festivals, newcomer support, '
    + 'Nepali language classes, sport and volunteering across Oita City and Beppu.',
  metadataBase: new URL('https://nepal-oita.com'),
  openGraph: { siteName: 'Nepal–Oita Community', locale: 'en_GB', type: 'website' },
}

/* Nothing in this app can be static: the header renders the signed-in member's
   name and links, so every page depends on the request's session. Declared once
   here, for the whole tree, rather than repeated on each page — and it also
   keeps the build from needing the Supabase credentials, which a CI build has no
   business holding. */
export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* The new-decisions notice, for signed-in members only.
     
     In the layout rather than on a page because it is about the site, not about
     wherever they happen to have landed. Both calls already happen further down
     the tree on most routes, and Next dedupes them within a render, so this adds
     no round trips on those. */
  const member = await getCurrentMember()
  const latest = member
    ? (await getMeetings(true)).filter((m) => m.status === 'approved')[0] ?? null
    : null

  return (
    /* `js` is set here rather than by a script, the way the static site had to.
       In this app there is no no-JavaScript render to fall back to, so the class
       is simply always true — and setting it in the markup means the theme's
       `.js` rules apply on the very first paint, with no flash. */
    <html lang="en" className="js" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <Sprite />
        <SetupBanner />
        <Nav />
        {latest && (
          <DecisionsNotice id={latest.id} title={latest.title}
                           dateLabel={longDate(latest.held_on)} />
        )}
        <BackButton />
        <main id="main">{children}</main>
        <Footer />
        <SiteMotion />
      </body>
    </html>
  )
}
