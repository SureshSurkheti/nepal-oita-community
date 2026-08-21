import type { MetadataRoute } from 'next'
import { getEvents } from '@/lib/content'
import { SITE_URL } from '@/lib/site'

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
  { path: '/events',     changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/programmes', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/gallery',    changeFrequency: 'monthly', priority: 0.7 },
  { path: '/stories',    changeFrequency: 'monthly', priority: 0.6 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))

  /* One event page per row. Wrapped, because a sitemap is the one route where
     failing loudly is the wrong trade: if Supabase is unreachable, a sitemap
     listing the five fixed pages is far better than a 500, which Google treats
     as "this site has no sitemap" and can take days to retry. */
  try {
    const events = await getEvents()
    for (const e of events) {
      routes.push({
        url: `${SITE_URL}/events/${e.slug}`,
        changeFrequency: 'yearly',
        priority: 0.5,
      })
    }
  } catch {
    // The fixed pages above still go out.
  }

  /* No `lastModified` anywhere. The tables carry no reliable modified date for
     this, and a lastmod that is really "whenever this was generated" trains
     Google to ignore the field — worse than leaving it out. */
  return routes
}
