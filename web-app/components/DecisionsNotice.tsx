'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from './Sprite'

/* "There are new decisions" — shown to a signed-in member until they dismiss it.
 *
 * Dismissal is kept in localStorage against the meeting's id, not in the
 * database. That is a deliberate choice rather than a shortcut: recording it
 * server-side would mean a `last_seen_decisions` column on members, a write on
 * every page view to keep it current, and a member's reading habits stored
 * against their name. For a notice whose whole job is to be dismissed once, the
 * browser is the right place, and the cost of getting it wrong is that somebody
 * on a new device sees a bar they have already read.
 *
 * Rendered as null until the effect has run, so the server-rendered markup and
 * the first client render agree — localStorage does not exist during the
 * server render, and reading it in the initial render is a hydration mismatch.
 */
export function DecisionsNotice({ id, title, dateLabel }: {
  id: string
  title: string
  dateLabel: string
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      setShow(window.localStorage.getItem(`noc-decision-seen`) !== id)
    } catch {
      // Private browsing, or storage disabled. Showing it is the safe failure.
      setShow(true)
    }
  }, [id])

  if (!show) return null

  const dismiss = () => {
    try { window.localStorage.setItem('noc-decision-seen', id) } catch { /* no-op */ }
    setShow(false)
  }

  return (
    <div className="notice" role="status">
      <div className="container notice__inner">
        <Icon name="calendar" />
        <p className="notice__text">
          <strong>New meeting decisions</strong> from {dateLabel} — {title}.
        </p>
        <Link className="btn btn--on-ink notice__cta" href="/decisions" onClick={dismiss}>
          Read them <Icon name="arrow-right" />
        </Link>
        <button className="icon-btn notice__close" type="button"
                aria-label="Dismiss this notice" onClick={dismiss}>
          <Icon name="close" />
        </button>
      </div>
    </div>
  )
}
