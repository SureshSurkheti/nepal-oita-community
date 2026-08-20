import Link from 'next/link'
import { Icon } from './Sprite'
import { getCurrentMember } from '@/lib/members'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './SignOutButton'
import { Drawer } from './Drawer'

export async function Nav() {
  const member = await getCurrentMember()

  /* Whether there is a SESSION, which is not the same question as whether there
     is a member. An account that has signed up but not yet entered its
     membership code has one and not the other — and the header used to show it
     a "Sign in" button, with no way to sign out from anywhere on the site. Type
     the wrong email into the sign-up form and you were stuck with it. */
  let hasSession = member !== null
  if (!member) {
    const { data } = await (await createClient()).auth.getUser()
    hasSession = data.user !== null
  }

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
          <Link className="nav__link" href="/programmes">What we do</Link>
          <Link className="nav__link" href="/events">Events</Link>
          <Link className="nav__link" href="/gallery">Gallery</Link>
          <Link className="nav__link" href="/decisions">Decisions</Link>
          <Link className="nav__link" href="/members">Members</Link>
          <Link className="nav__link" href="/#contact">Contact</Link>
          {member?.is_admin && <Link className="nav__link" href="/admin">Committee</Link>}
        </nav>

        <div className="nav__actions">
          {member ? (
            <>
              <Link className="btn btn--ghost nav__cta" href="/me">Profile</Link>
              <SignOutButton />
            </>
          ) : hasSession ? (
            <>
              <Link className="btn btn--primary nav__cta" href="/sign-in">
                <Icon name="shield" /> Enter your code
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link className="btn btn--primary nav__cta" href="/sign-in">
              <Icon name="shield" /> Sign in
            </Link>
          )}
          <Drawer member={member ? { name: member.name, isAdmin: member.is_admin } : null} />
        </div>
      </div>
    </header>
  )
}
