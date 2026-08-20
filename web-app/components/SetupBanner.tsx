import { supabaseConfigured } from '@/lib/env'
import { DEV_SIGNIN_ENABLED } from '@/lib/devSignIn'

/* Shown only while Supabase is not connected, and only outside production —
   production throws instead. Loud on purpose: without it the app looks like a
   working site with no members, which is a confusing thing to debug. */
export function SetupBanner() {
  /* The sign-in bypass is the more urgent of the two: an unconnected database
     is obvious the moment you look at a page, whereas a bypass left installed
     looks exactly like a working site. So it wins the banner. */
  if (supabaseConfigured()) {
    if (!DEV_SIGNIN_ENABLED) return null
    return (
      <div className="setup-banner" role="status">
        <div className="container">
          <strong>Development sign-in is on.</strong> Anyone can sign in as any
          member and read every stored phone number. Before publishing: run{' '}
          <code>supabase/dev/dev_signin_remove.sql</code>, turn off Anonymous
          sign-ins, and delete <code>NEXT_PUBLIC_DEV_SIGNIN</code> from{' '}
          <code>.env.local</code>.
        </div>
      </div>
    )
  }

  return (
    <div className="setup-banner" role="status">
      <div className="container">
        <strong>Supabase is not connected.</strong> Pages render, but sign-in and
        the member lists are inert. In <code>web-app/</code>:{' '}
        <code>cp .env.example .env.local</code> and paste the URL and anon key
        from your project&rsquo;s Settings → API. See{' '}
        <code>web-app/README.md</code>.
      </div>
    </div>
  )
}
