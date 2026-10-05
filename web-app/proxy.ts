import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseEnv } from '@/lib/env'
import { DEFAULT_LOCALE, LOCALES, isLocale } from '@/lib/i18n'

/* Which language to send somebody who arrived without one in the URL.
 *
 * Read from Accept-Language, which the browser derives from the reader's own OS
 * and browser settings — so a phone set to Nepali lands on Nepali without
 * anybody being asked. Parsed by hand rather than pulling in negotiator and
 * intl-localematcher: two locales and no regional variants do not justify two
 * dependencies in a community site's bundle.
 *
 * A cookie set by the switcher wins over the header, because an explicit choice
 * beats a guess — somebody whose phone is in Japanese but who reads Nepali has
 * said so by pressing the button, and the site should not argue with them on the
 * next visit. */
function pickLocale(request: NextRequest): string {
  const chosen = request.cookies.get('noc-locale')?.value
  if (isLocale(chosen)) return chosen

  const header = request.headers.get('accept-language') ?? ''
  /* "ne-NP,ne;q=0.9,en;q=0.8" -> [["ne-np",1],["ne",0.9],["en",0.8]], best first.
     The base language is compared, so ne-NP and ne-IN both match ne. */
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...rest] = part.trim().split(';')
      const q = rest.find((r) => r.trim().startsWith('q='))
      return { base: tag.toLowerCase().split('-')[0], q: q ? Number(q.split('=')[1]) : 1 }
    })
    .filter((x) => x.base && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q)

  return ranked.find((x) => (LOCALES as readonly string[]).includes(x.base))?.base
      ?? DEFAULT_LOCALE
}

/* Next 16 renamed this file from middleware.ts to proxy.ts and the export
   from `middleware` to a default `proxy`. Same job.

   Refreshes the Supabase session on every request and writes the rotated
   cookies onto the response. Without this a signed-in member is quietly logged
   out when their access token expires, mid-visit. */
export default async function proxy(request: NextRequest) {
  /* FIRST: every page lives under /en or /ne, so a request without one has to be
     sent to a language before anything else happens. Done here rather than with
     a root page that redirects, because a redirect rendered by React costs a
     round trip and a flash of blank page.
     
     A 307, which is what NextResponse.redirect defaults to — not a 308. The
     choice of language is not permanent: it depends on the reader's own
     settings and on the cookie the switcher sets, and a browser that cached a
     permanent redirect would pin somebody to whichever language they happened to
     see first, on every later visit, with no way back. */
  const { pathname } = request.nextUrl
  const first = pathname.split('/')[1]
  if (!isLocale(first)) {
    const url = request.nextUrl.clone()
    url.pathname = `/${pickLocale(request)}${pathname === '/' ? '' : pathname}`
    return NextResponse.redirect(url)
  }

  /* NOBODY SIGNED IN? DO NOTHING.
   *
   * This ran createServerClient() and getUser() on every matched request,
   * signed in or not — and getUser() deliberately calls Supabase over the
   * network rather than trusting the token. For the overwhelming majority of
   * traffic (visitors who have never signed in, and every search-engine
   * crawler) there is no session to refresh, so all of that was work done to
   * discover there was nothing to do. It also sat in front of the newly
   * prerendered pages, which is the one place a network call has no business
   * being.
   *
   * A refresh is only possible if a session cookie exists, so its absence is a
   * complete answer. @supabase/ssr names them sb-<project-ref>-auth-token, and
   * chunks large ones with .0/.1 suffixes, so the prefix test covers both. */
  const signedIn = request.cookies.getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
  if (!signedIn) return NextResponse.next({ request })

  const env = supabaseEnv()
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    env.url,
    env.key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser(), not getSession(): getUser revalidates the token with Supabase,
  // so an expired or revoked session is caught here rather than trusted.
  await supabase.auth.getUser()

  return response
}

export const config = {
  /* robots.txt and sitemap.xml are NEW here and they matter: they are route
     handlers at the app root, not pages, so they must never be given a language
     prefix. Without them in this list the locale redirect above sends Googlebot
     from /robots.txt to /en/robots.txt, which does not exist — the crawler gets
     a 404 for the one file that tells it what to crawl.
     
     .txt and .xml joined the extension list for the same reason. */
  // Must be a single static string — Turbopack parses this at build time and
  // refuses anything it cannot read statically, including a concatenation.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js|txt|xml)$).*)'],
}
