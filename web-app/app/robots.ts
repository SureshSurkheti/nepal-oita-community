import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/* robots.txt, generated rather than hand-written so the sitemap URL cannot drift
 * away from the domain the rest of the metadata uses.
 *
 * ONLY /admin/ IS DISALLOWED, AND THAT IS DELIBERATE
 * /me, /sign-in, /decisions and /members are all private, and none of them is
 * listed here. Disallowing a page stops the crawler fetching it — which also
 * stops it ever reading the `noindex` on that page, so the URL can still surface
 * in results as a bare link with no title. Letting Google fetch a noindex page is
 * the only way to have it dropped for good. /admin/ is the exception because it
 * redirects to sign-in before rendering anything, so there is nothing for a
 * crawler to read there either way, and keeping it out saves crawl budget.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
