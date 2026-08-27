import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseEnv } from '@/lib/env'

/* A Supabase client with NO SESSION, ever — and that is the entire point.
 *
 * WHY THIS EXISTS
 * Two separate problems, one answer.
 *
 * 1. CACHEABILITY. `lib/supabase/server.ts` reads cookies, and reading cookies
 *    makes a route dynamic — Next.js cannot prerender or CDN-cache anything that
 *    touches the request. It also cannot be called from inside `unstable_cache`
 *    at all: request-scope APIs are not available in a cache scope. So every
 *    page that wanted published events had to be rendered per visitor, and the
 *    whole site ran at `x-vercel-cache: MISS` with seven database round trips
 *    per page view.
 *
 * 2. SAFETY. Caching data fetched WITH a session is how a members-only field
 *    ends up in a CDN entry served to the public. On this site that field is a
 *    phone number: `getMembers()` joins `member_contacts`, which returns rows
 *    for a signed-in member and nothing for `anon`. Cache that result and you
 *    have published the register's phone numbers.
 *
 * This client makes the second problem structurally impossible rather than
 * something to remember. There is no cookie jar and no session to attach, so
 * every row it returns is a row `anon` may read — checked by the database's own
 * RLS policies, not by anything here. Whatever it fetches is safe to cache,
 * because the public could have fetched it themselves.
 *
 * WHAT MUST NOT USE IT
 * Anything whose answer depends on who is asking: getCurrentMember, getMembers
 * (the contacts join), getMeetings, and the getMyDraft* pair. Those need the
 * cookie-reading client and their routes stay dynamic. If you are about to reach
 * for this client to make one of those faster, the answer is no.
 */
export function createPublicClient() {
  const env = supabaseEnv()
  return createSupabaseClient(env.url, env.key, {
    auth: {
      // Belt and braces. There is nowhere to persist a session to on the server,
      // but saying so means a future refactor cannot accidentally give it one.
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
