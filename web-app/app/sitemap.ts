import type { MetadataRoute } from 'next'
import { getEvents } from '@/lib/content'
import { SITE_URL } from '@/lib/site'
import { LOCALES, DEFAULT_LOCALE } from '@/lib/i18n'

/* Generated per request, not at build time.
 *
 * The event pages are database rows, so the list cannot be known when the site is
 * compiled — and the root layout is force-dynamic precisely so that a build does
 * not need Supabase credentials. A build-time sitemap would put them back.
 */
export const dynamic = 'force-dynamic'

/* Only pages a search engine should index. /members and /decisions carry
   `noindex` — the first because everyone on it is a named private individual, the
   second because it is members-only — and /me, /sign-in and /admin are private.
   Listing any of them here would be asking Google to index a page the same site
   tells it to drop. */
const PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency']; priority: number }[] = [
  { path: '/',           changeFrequency: 'weekly',  priority: 1.0 },
  /* Second only to the home page. It is the only route on this site that
     answers a question somebody types into a search box without already
     knowing the community exists, and it changes only when the law does. */
  { path: '/arriving',   changeFrequency: 'yearly',  priority: 0.9 },
  { path: '/events',     changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/programmes', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/gallery',    changeFrequency: 'monthly', priority: 0.7 },
  { path: '/stories',    changeFrequency: 'monthly', priority: 0.6 },
]

/* Every URL is listed once per language, and each entry declares the whole set
   through `alternates.languages`.
   
   Both halves are needed and they do different jobs. The separate entries are
   what gets the Nepali pages CRAWLED at all — a URL absent from the sitemap and
   linked only from a switcher may wait a long time for discovery. The alternates
   are what stops Google treating /en/events and /ne/events as duplicates of each
   other, and what lets it serve the Nepali one to somebody searching in Nepali.
   
   x-default points at English: it is the fallback for a reader whose language
   matches neither, and it has to be one of the real URLs, not the bare domain —
   the bare domain redirects, and a redirect is not a valid x-default target. */
function alternatesFor(path: string) {
  const languages: Record<string, string> = {}
  for (const l of LOCALES) languages[l] = `${SITE_URL}/${l}${path === '/' ? '' : path}`
  languages['x-default'] = `${SITE_URL}/${DEFAULT_LOCALE}${path === '/' ? '' : path}`
  return { languages }
}

function localeUrl(locale: string, path: string) {
  return `${SITE_URL}/${locale}${path === '/' ? '' : path}`
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = PAGES.flatMap((p) =>
    LOCALES.map((l) => ({
      url: localeUrl(l, p.path),
      changeFrequency: p.changeFrequency,
      priority: p.priority,
      alternates: alternatesFor(p.path),
    })),
  )

  /* One event page per row. Wrapped, because a sitemap is the one route where
     failing loudly is the wrong trade: if Supabase is unreachable, a sitemap
     listing the five fixed pages is far better than a 500, which Google treats
     as "this site has no sitemap" and can take days to retry. */
  try {
    const events = await getEvents()
    for (const e of events) {
      for (const l of LOCALES) {
        routes.push({
          url: localeUrl(l, `/events/${e.slug}`),
          changeFrequency: 'yearly',
          priority: 0.5,
          alternates: alternatesFor(`/events/${e.slug}`),
        })
      }
    }
  } catch {
    // The fixed pages above still go out.
  }

  /* No `lastModified` anywhere. The tables carry no reliable modified date for
     this, and a lastmod that is really "whenever this was generated" trains
     Google to ignore the field — worse than leaving it out. */
  return routes
}
