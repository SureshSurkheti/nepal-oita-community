import type { Metadata } from 'next'
import '../theme.css'
import { Sprite } from '@/components/Sprite'
import { SiteMotion } from '@/components/SiteMotion'
import { Nav } from '@/components/Nav'
import { SetupBanner } from '@/components/SetupBanner'
import { Footer } from '@/components/Footer'
import { DecisionsNoticeGate } from '@/components/DecisionsNoticeGate'
import { BackButton } from '@/components/BackButton'
import { SITE_URL, SITE_NAME, SITE_ALT_NAMES, SITE_EMAIL, SITE_SOCIALS, abs } from '@/lib/site'
import { LOCALES, LOCALE_TAGS, toLocale, type Locale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'The Nepali community of Oita Prefecture, Japan — festivals, newcomer support, '
    + 'Nepali language classes, sport and volunteering across Oita City and Beppu.',
  /* Every relative URL in this app's metadata — canonicals, Open Graph images —
     is resolved against this. It has to be the domain the site is actually
     served from or the canonicals point somewhere that does not exist. */
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  keywords: [
    'Nepali community Oita', 'Nepal Oita Community', 'ネパール大分コミュニティ',
    'Nepali in Japan', 'Nepali community Beppu', 'Oita Nepali association',
    'Dashain Oita', 'Tihar Japan', 'Nepali students APU Beppu',
    'Nepali language classes Oita', 'नेपाली समुदाय जापान',
  ],
  /* No `alternates` here on purpose. Metadata is inherited, so a canonical set
     in the layout would be inherited by every page that does not set its own —
     which means half the site declaring itself a duplicate of the home page.
     Each public page sets its own, and only its own. */
  openGraph: {
    siteName: SITE_NAME,
    locale: 'en_GB',
    type: 'website',
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image' },
  /* Explicit rather than left to Google's defaults: `max-image-preview: large`
     is what allows a photograph beside the result instead of a thumbnail, and
     this site is mostly photographs of events. */
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
function orgJsonLd(lang: Locale) {
  return {
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
      /* Follows the page. A Nepali page that tells Google its content is
         English contradicts <html lang> and the hreflang pair beside it. */
      inLanguage: LOCALE_TAGS[lang],
      publisher: { '@id': `${SITE_URL}/#organisation` },
    },
  ],
  }
}

/* THE LAYOUT NO LONGER READS THE REQUEST, and that is the whole point.
 *
 * It used to say `export const dynamic = 'force-dynamic'`, because the header
 * rendered the signed-in member's name and the decisions banner needed to know
 * whether there was a member. Both meant reading cookies in the root layout,
 * which forces EVERY route in the app to render per request. Measured from
 * Japan: `x-vercel-cache: MISS` on every hit, seven database queries per page
 * view, 1.0-3.2s to first byte — for pages whose content is identical for every
 * visitor.
 *
 * Both readers moved into the browser: Nav resolves its own session, and
 * DecisionsNoticeGate fetches the banner. Neither touches the request here, so
 * pages are free to be prerendered and served from the edge. Pages that genuinely
 * depend on the viewer — /me, /members, /decisions, /sign-in, /admin/* — declare
 * `force-dynamic` themselves rather than inheriting it from the whole tree.
 *
 * ONE CONSEQUENCE WORTH KNOWING: a production build now prerenders the public
 * pages, so it needs the Supabase environment variables at BUILD time, not only
 * at run time. On Vercel they are already there. A build without them used to
 * succeed and will now fail in lib/env.ts — which is the correct trade, because
 * the alternative is shipping a site that cannot be cached. */

/* Both languages are prerendered at build time. Without this Next has no list
   of locales to build, so /en and /ne would each be rendered on demand on their
   first visit — and the whole point of the previous change was that the public
   pages come off a CDN. */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }))
}

/* NOTHING ABOUT EVENTS IS FETCHED HERE ANY MORE, and that is the point.
 *
 * The header used to carry a badge counting what was coming up, so this layout
 * fetched the event list and serialised a trimmed copy of it into the HTML of
 * EVERY page on the site — the gallery, the minutes, the sign-in form, all of
 * them paying for a control most visitors never pressed.
 *
 * The badge is gone (see components/EventSpotlight for the argument), so the
 * cost goes with it. The home page fetches events because it shows them; no
 * other page pays. */

export default async function RootLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const lang = toLocale((await params).lang)
  return (
    /* `js` is set here rather than by a script, the way the static site had to.
       In this app there is no no-JavaScript render to fall back to, so the class
       is simply always true — and setting it in the markup means the theme's
       `.js` rules apply on the very first paint, with no flash. */
    /* The real language, not a hard-coded "en". A screen reader picks its voice
       from this, and Google reads it as a signal alongside hreflang — an entire
       page of Devanagari announced as English is worse than no declaration. */
    <html lang={LOCALE_TAGS[lang]} className="js" data-scroll-behavior="smooth">
      <body>
        <script type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd(lang)) }} />
        <a className="skip-link" href="#main">{getDictionary(lang).nav.skipToContent}</a>
        <Sprite />
        <SetupBanner />
        <Nav />
        <DecisionsNoticeGate />
        <BackButton />
        <main id="main">{children}</main>
        <Footer lang={lang} />
        <SiteMotion />
      </body>
    </html>
  )
}
