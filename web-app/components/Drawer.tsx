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

  // Close on navigation, or the menu stays over the page you just asked for.
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
        <div className="drawer__scrim" onClick={() => setOpen(false)} />
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
              <Link key={l.href} className="drawer__link" href={l.href}>
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
                  <Link className="btn btn--ghost btn--block u-mb-1" href="/admin">
                    <Icon name="shield" /> Committee
                  </Link>
                )}
                <Link className="btn btn--primary btn--block" href="/me">
                  <Icon name="user" /> My profile
                </Link>
              </>
            ) : (
              <Link className="btn btn--primary btn--block" href="/#join">
                <Icon name="user-plus" /> Join the community
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
