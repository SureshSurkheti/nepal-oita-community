'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'
import { SignOutButton } from './SignOutButton'
import { Drawer } from './Drawer'

type NavMember = { name: string; isAdmin: boolean } | null

/* The site header. A CLIENT component, and that is a performance decision.
 *
 * WHY IT MOVED OFF THE SERVER
 * This used to be an async server component calling getCurrentMember(), so the
 * root layout read cookies, so every route in the app was dynamic. Nothing could
 * be prerendered or held in a CDN: the site answered `x-vercel-cache: MISS` on
 * every request and spent ~1.5s of Pacific round trip and seven database queries
 * rebuilding an identical page for each visitor. One name in the corner of the
 * header cost the whole site its cache.
 *
 * It is still server-rendered into the cached HTML — a client component is not a
 * client-only component. What it no longer does is READ THE REQUEST, which is the
 * thing that forced every page dynamic. The session is resolved in the browser a
 * few hundred milliseconds later, over a connection it already has open.
 *
 * WHY THE WHOLE HEADER RATHER THAN A CHILD
 * Two parts of this depend on the session and they are not siblings: the
 * Committee link belongs inside `.nav__links`, and Profile/Sign out inside
 * `.nav__actions`. Splitting it into two client components meant either two
 * session lookups or a context provider, and moving the Committee link out of
 * the nav list changed the layout. One component, one lookup, identical DOM.
 *
 * NO WRONG-STATE FLASH, AND NO LAYOUT SHIFT EITHER
 * Two failure modes pull in opposite directions and both are avoidable.
 *
 * Render "Sign in" immediately and a signed-in member watches it turn into
 * "Profile" — a visible lie followed by a jump. Render nothing and the slot has
 * no width, so the nav links slide sideways the moment the real controls land.
 * That second one is Cumulative Layout Shift, which Google measures.
 *
 * So the signed-out control IS rendered before the answer is known, and simply
 * made `visibility: hidden` by `.nav__actions--waiting`. It reserves its own
 * exact width — no magic pixel value to keep in step with the button's padding —
 * and `visibility: hidden` takes it out of the tab order and the accessibility
 * tree, so nobody can focus or hear a button that is not really there.
 *
 * Net effect: a visitor (which is nearly all traffic, and every crawler) gets
 * zero shift and zero flash, because the invisible placeholder is exactly the
 * control that is about to appear. A member gets one small widening when their
 * session resolves, which needs a real network round trip and cannot be
 * predicted from the cached HTML.
 */
export function Nav() {
  const [member, setMember] = useState<NavMember>(null)
  const [hasSession, setHasSession] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let live = true

    async function read() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!live) return

      if (!user) {
        setMember(null); setHasSession(false); setReady(true)
        return
      }

      /* A session is not a membership. An account that has signed up but not yet
         entered its claim code has the first and not the second — and it needs a
         way to sign out, or a typo in the email address strands it with no exit. */
      setHasSession(true)
      const { data } = await supabase.from('members')
        .select('name, is_admin').eq('user_id', user.id).maybeSingle()
      if (!live) return

      setMember(data ? { name: data.name as string, isAdmin: data.is_admin as boolean } : null)
      setReady(true)
    }

    read()

    /* Signing out in another tab, or a token refresh, should show here rather
       than leaving a Profile button pointing at a page that now bounces to
       sign-in. */
    const { data: sub } = supabase.auth.onAuthStateChange(() => { read() })
    return () => { live = false; sub.subscription.unsubscribe() }
  }, [])

  return (
    /* nav--member widens the nav's own collapse point. Signed in there are two
       more controls and, for the committee, another link — enough that between
       roughly 950 and 1150px the row ran out of room, and because nothing was
       marked nowrap the browser resolved it by wrapping "What we do" onto two
       lines and stretching the header. */
    <header className={`nav${hasSession ? ' nav--member' : ''}`} data-nav>
      <div className="nav__inner">
        <Link className="brand" href="/" aria-label="Nepal–Oita Community, home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand__mark" src="/images/logo-mark.jpg" alt="" width={320} height={320} />
          <span className="brand__text">
            <span className="brand__name">Nepal–Oita</span>
            <span className="brand__sub">Community</span>
          </span>
        </Link>

        <nav className="nav__links" aria-label="Primary">
          <Link className="nav__link" href="/#about">About</Link>
          <Link className="nav__link" href="/programmes">Programmes</Link>
          <Link className="nav__link" href="/events">Events</Link>
          <Link className="nav__link" href="/gallery">Gallery</Link>
          <Link className="nav__link" href="/decisions">Decisions</Link>
          <Link className="nav__link" href="/members">Members</Link>
          <Link className="nav__link" href="/#contact">Contact</Link>
          {member?.isAdmin && <Link className="nav__link" href="/admin">Committee</Link>}
        </nav>

        {/* Signing in and out stays in the header at EVERY width.

            These used to be hidden below the collapse point and offered inside
            the drawer instead, which meant a visitor on a phone had to open a
            menu to find "Sign in" and a member had to open it to sign out. The
            labels collapse to icons on a narrow screen rather than the buttons
            disappearing — the control is the thing worth keeping, not its text. */}
        <div className={`nav__actions${ready ? '' : ' nav__actions--waiting'}`}>
          {member ? (
            <>
              <Link className="btn btn--ghost nav__cta" href="/me"
                    aria-label="My profile" title="My profile">
                <Icon name="user" /><span className="nav__label">Profile</span>
              </Link>
              <SignOutButton />
            </>
          ) : hasSession ? (
            <>
              <Link className="btn btn--primary nav__cta" href="/sign-in"
                    aria-label="Enter your membership code" title="Enter your membership code">
                <Icon name="shield" /><span className="nav__label">Enter your code</span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link className="btn btn--primary nav__cta" href="/sign-in"
                  aria-label="Sign in" title="Sign in">
              <Icon name="shield" /><span className="nav__label">Sign in</span>
            </Link>
          )}
          <Drawer member={member} />
        </div>
      </div>
    </header>
  )
}
