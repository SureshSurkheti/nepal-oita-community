'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Icon } from './Sprite'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#about', label: 'About' },
  { href: '/programmes', label: 'Programmes' },
  { href: '/events', label: 'Events' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/stories', label: 'Stories' },
  { href: '/decisions', label: 'Decisions' },
  { href: '/members', label: 'Members' },
  { href: '/#contact', label: 'Contact' },
]

/* The drawer takes the member's identity because the header's own collapse
   point moved: signed in, the desktop links give way to this menu earlier, so
   anything only a member can reach has to be reachable from in here too.
   Without that, a signed-in member on a 1000px-wide window would find no way
   to their own profile or, if they are on the committee, to the admin pages. */
export function Drawer({ member = null }: {
  member?: { name: string; isAdmin: boolean } | null
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  /* CLOSING IS DONE ON CLICK, NOT ON NAVIGATION.
   *
   * This used to rely on the pathname effect below alone, and that silently
   * failed for four of the ten controls in here. usePathname() returns the path
   * WITHOUT the hash, so on the home page "About" (/#about), "Contact"
   * (/#contact), "Join the community" (/#join) and "Home" (/) all leave the
   * pathname exactly as it was. The effect never re-ran, and the menu sat over
   * the section it had just scrolled to. The six links that change the path —
   * Programmes, Events, Gallery, Stories, Decisions, Members — worked, which is
   * why it looked like an intermittent bug rather than a missing case.
   *
   * Closing on the click itself needs no assumption about whether the URL
   * changes, so it cannot come apart the next time a hash link is added. */
  const close = () => setOpen(false)

  /* Kept as well, for navigation this component did not initiate: the browser's
     back button, or a redirect out of a page. Harmless when the click already
     closed it — setting false twice costs nothing. */
  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <button className="icon-btn nav__burger" type="button" aria-label="Open menu"
              aria-expanded={open} aria-controls="drawer" onClick={() => setOpen(true)}>
        <Icon name="menu" />
      </button>

      <div className={`drawer${open ? ' is-open' : ''}`} id="drawer" inert={!open || undefined}>
        <div className="drawer__scrim" onClick={close} />
        <div className="drawer__panel" role="dialog" aria-modal="true" aria-label="Site menu">
          <div className="drawer__top">
            <span className="brand__sub">Menu</span>
            <button className="icon-btn" type="button" aria-label="Close menu"
                    onClick={() => setOpen(false)}>
              <Icon name="close" />
            </button>
          </div>
          <nav className="drawer__links" aria-label="Mobile">
            {LINKS.map((l, i) => (
              <Link key={l.href} className="drawer__link" href={l.href} onClick={close}>
                {l.label} <small>{String(i + 1).padStart(2, '0')}</small>
              </Link>
            ))}
          </nav>
          {/* Places to go, and nothing else. Signing out lives in the header at
              every width now, so it is deliberately absent here: a destructive
              action does not belong in a list of links, where it sits one thumb
              away from "Members". */}
          <div className="drawer__foot">
            {member ? (
              <>
                <p className="text-sm muted u-mb-1">
                  Signed in as <strong>{member.name}</strong>
                </p>
                {member.isAdmin && (
                  <Link className="btn btn--ghost btn--block u-mb-1" href="/admin" onClick={close}>
                    <Icon name="shield" /> Committee
                  </Link>
                )}
                <Link className="btn btn--primary btn--block" href="/me" onClick={close}>
                  <Icon name="user" /> My profile
                </Link>
              </>
            ) : (
              <Link className="btn btn--primary btn--block" href="/#join" onClick={close}>
                <Icon name="user-plus" /> Join the community
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
