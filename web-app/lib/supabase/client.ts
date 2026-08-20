import { createBrowserClient } from '@supabase/ssr'
import { supabaseEnv } from '@/lib/env'

/** For Client Components — the OTP form and the photo upload. */
export function createClient() {
  const env = supabaseEnv()
  return createBrowserClient(
    env.url,
    env.key,
  )
}
