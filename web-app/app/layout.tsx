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
import { SITE_URL, SITE_NAME, SITE_ALT_NAMES, SITE_EMAIL, SITE_SOCIALS, abs } from '@/lib/site'

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'The Nepali community of Oita Prefecture, Japan — festivals, newcomer support, '
    + 'Nepali language classes, sport and volunteering across Oita City and Beppu.',
  
  // 👇 ここから追加：新しい favicon のパスを指定します
  icons: {
    icon: '/images/favicon.ico',       // public/images/favicon.ico を指します
    shortcut: '/images/favicon.ico',   // ブラウザの互換性のための記述
    apple: '/apple-icon.png',          // 現在 app/ フォルダにある apple-icon をそのまま維持
  },
  // 👆 ここまで追加

  /* Every relative URL in this app's metadata — canonicals, Open Graph images —
     is resolved against this. It has to be the domain the site is actually
     served from or the canonicals point somewhere that does not exist. */
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  keywords: [
    'Nepali community Oita', 'Nepal Oita Community', 'ネパール大分コミュニティ',
    'Nepali in Japan', 'Nepali community Beppu', 'Oita Nepali association',
    'Dashain Oita', 'Tihar Japan', 'Nepali students APU Beppu',
    'Nepali language classes Oita', 'नेपाली समुदायジャパン',
  ],
  openGraph: {
    siteName: SITE_NAME,
    locale: 'en_GB',
    type: 'website',
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large',
                 'max-snippet': -1, 'max-video-preview': -1 },
  },
}

/* Who this organisation is, in the form a search engine can read.
 *
 * On every page rather than only the home page, which is what Google expects for
 * an Organization node — it is a statement about the site, not about the page.
 * `sameAs` is the part that earns its place: it is how the site, the Facebook
 * page, the YouTube channel and the TikTok account are understood as one body
 * rather than four unrelated results. */
const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['NGO', 'Organization'],
      '@id': `${SITE_URL}/#organisation`,
      name: SITE_NAME,
      alternateName: SITE_ALT_NAMES,
      url: SITE_URL,
      /* A PNG, not the SVG. Google's Organization `logo` is documented as a
         raster image of at least 112x112 — apple-icon.png is 180x180 and is
         already there. The SVG is the browser-tab icon and stays at icon.svg. */
      logo: abs('/apple-icon.png'),
      image: abs('/opengraph-image.jpg'),
      email: SITE_EMAIL,
      foundingDate: '2019',
      description:
        'A community association for Nepali people living in Oita Prefecture, '
        + 'Japan — festivals, support for new arrivals, Nepali language classes '
        + 'for children, sport and volunteering across Oita City and Beppu.',
      areaServed: {
        '@type': 'AdministrativeArea',
        name: 'Oita Prefecture',
        address: { '@type': 'PostalAddress', addressRegion: 'Oita', addressCountry: 'JP' },
      },
      address: { '@type': 'PostalAddress', addressRegion: 'Oita', addressCountry: 'JP' },
      sameAs: SITE_SOCIALS,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#organisation` },
    },
  ],
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
        <script type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }} />
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
