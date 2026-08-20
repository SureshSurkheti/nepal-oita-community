import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseEnv } from '@/lib/env'

/* Next 16 renamed this file from middleware.ts to proxy.ts and the export
   from `middleware` to a default `proxy`. Same job.

   Refreshes the Supabase session on every request and writes the rotated
   cookies onto the response. Without this a signed-in member is quietly logged
   out when their access token expires, mid-visit. */
export default async function proxy(request: NextRequest) {
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
