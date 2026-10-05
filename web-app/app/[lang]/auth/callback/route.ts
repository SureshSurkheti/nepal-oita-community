import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toLocale } from '@/lib/i18n'
import { safeNext } from '@/lib/safeNext'

/* WHERE EVERY SUPABASE EMAIL LINK LANDS.
 *
 * The browser client is created by createBrowserClient, which uses the PKCE
 * flow. That means a link in an email — a password recovery, an address
 * confirmation — does not carry a session. It carries a one-time `code`, and
 * somebody has to exchange it for a real session and write the cookies. Until
 * this route existed nothing did, so there was no way to offer a password reset
 * at all: the email would have arrived and its link would have gone to a page
 * that did not know who had opened it.
 *
 * It is a Route Handler, not a page, because the exchange has to happen
 * somewhere that can SET COOKIES. A Server Component cannot — lib/supabase/server
 * swallows that failure on purpose — so doing this in a page would exchange the
 * code, throw the session away, and leave the member looking at a form that
 * thinks they are a stranger.
 *
 * `next` is checked rather than trusted — see lib/safeNext, which is a separate
 * file because a guard nobody can run is a guard you are trusting rather than
 * relying on. The first version of it lived inline here and tested only for a
 * leading "//"; the tests found that "/\evil.com" walks straight past that,
 * because browsers normalise the backslash. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> },
) {
  const lang = toLocale((await params).lang)
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeNext(url.searchParams.get('next'), lang)

  if (!code) {
    return NextResponse.redirect(new URL(`/${lang}/sign-in?error=link`, url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  /* An expired or already-used link is the ordinary case, not an exception:
     recovery links are one-shot and time-limited, and people open them twice.
     It has to say so, rather than dropping somebody on a page that silently
     behaves as though they never clicked. */
  if (error) {
    return NextResponse.redirect(new URL(`/${lang}/sign-in?error=expired`, url.origin))
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
