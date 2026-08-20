/* The two Supabase environment variables, and what to do when they are missing.
 *
 * Which depends entirely on where you are:
 *
 *   production  — throw. A live members page that quietly rendered empty
 *                 because the database was unreachable would look like a
 *                 community with no members, and nobody would notice for a
 *                 week. Failing loudly is the only safe answer.
 *
 *   development — carry on. Refusing to render anything until Supabase is set
 *                 up means you cannot look at the site you are building, which
 *                 is worse than useless. The client is pointed at a dead local
 *                 port so every call fails immediately, and a banner says so.
 *
 * The first version of this file threw in both cases, and the result was that
 * `npm run dev` could not serve a single page before a Supabase project existed. */

const NOT_CONFIGURED = {
  // 127.0.0.1:1 rather than a made-up hostname: it refuses the connection
  // instantly instead of waiting on a DNS lookup that will fail anyway.
  url: 'http://127.0.0.1:1',
  key: 'supabase-not-configured',
}

/* The dashboard shows two URLs that look interchangeable and are not:
 *
 *   Settings → API        https://xxxx.supabase.co              <- what we want
 *   Settings → Data API   https://xxxx.supabase.co/rest/v1/     <- the REST root
 *
 * Paste the second and the client builds `…/rest/v1//rest/v1/members`, which
 * Supabase answers with "Invalid path specified in request URL". Every query
 * then fails and every page renders as though the site simply had no content —
 * which took an hour to spot. Both forms are accepted here instead. */
function normaliseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, '')            // trailing slashes
    .replace(/\/rest\/v1$/, '')      // the REST root, if that is what was pasted
    .replace(/\/graphql\/v1$/, '')
}

function read() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  return {
    url: raw ? normaliseUrl(raw) : raw,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  }
}

/** Is there a real project behind this? Used to show the setup banner. */
export function supabaseConfigured(): boolean {
  const { url, key } = read()
  return Boolean(url && key)
}

export function supabaseEnv(): { url: string; key: string } {
  const { url, key } = read()
  if (url && key) return { url, key }

  const missing = [
    !url && 'NEXT_PUBLIC_SUPABASE_URL',
    !key && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean) as string[]

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      [
        `Supabase is not configured: ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not set.`,
        '',
        'Both values are in the Supabase dashboard under Project settings → API.',
        '',
        '  Vercel:  Settings → Environment Variables, then redeploy',
        '  Self-hosted: set them in the environment that runs `next start`',
        '',
        'Both are safe to expose to the browser — the anon key can only reach what',
        'the row-level security policies in supabase/migrations allow.',
      ].join('\n'),
    )
  }

  return NOT_CONFIGURED
}
