import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseEnv } from '@/lib/env'

/* Next 16 renamed this file from middleware.ts to proxy.ts and the export
   from `middleware` to a default `proxy`. Same job.

   Refreshes the Supabase session on every request and writes the rotated
   cookies onto the response. Without this a signed-in member is quietly logged
   out when their access token expires, mid-visit. */
export default async function proxy(request: NextRequest) {
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js)$).*)'],
}
