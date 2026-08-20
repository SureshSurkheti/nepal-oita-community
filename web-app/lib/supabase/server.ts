import { createServerClient } from '@supabase/ssr'
import { supabaseEnv } from '@/lib/env'
import { cookies } from 'next/headers'

/** For Server Components, Server Actions and Route Handlers. */
export async function createClient() {
  const env = supabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(
    env.url,
    env.key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            /* A Server Component cannot set cookies. Harmless: the middleware
               refreshes the session on every request, so the only thing lost
               here is a duplicate write. */
          }
        },
      },
    },
  )
}
