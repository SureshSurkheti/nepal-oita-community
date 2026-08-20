'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from './Sprite'

/* Shows the first row of a long grid and puts the rest behind a control.
 *
 * Rows are MEASURED, never counted. These grids change column count between
 * phone and desktop, so "show the first three" leaves a ragged part-row on one
 * of them. Children are grouped by their offsetTop — each distinct top is one
 * row — and whole rows are added until at least MIN are visible. That minimum
 * matters on a phone, where a single-column grid's first row is one card, and
 * one card above a "Show all 6" button reads as a bug rather than a preview. */
export function ShowMore({
  children,
  className,
  href,
  gated = false,
  min = 3,
  id,
}: {
  children: React.ReactNode
  className: string
  /** Where the full set lives. Omit for an in-place expand. */
  href?: string
  /** href pages that ask for a member's number first. */
  gated?: boolean
  min?: number
  id?: string
}) {
  const grid = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const el = grid.current
    if (!el) return

    const measure = () => {
      const items = Array.from(el.children) as HTMLElement[]
      setTotal(items.length)
      if (items.length < 2) { setPreview(null); return }

      // Measure with everything shown, or the hidden ones have no offsetTop.
      const wasHidden = items.map((n) => n.hidden)
      items.forEach((n) => { n.hidden = false })

      const rows: number[] = []
      let lastTop: number | null = null
      for (const n of items) {
        if (n.offsetTop !== lastTop) { rows.push(0); lastTop = n.offsetTop }
        rows[rows.length - 1]++
      }
      items.forEach((n, i) => { n.hidden = wasHidden[i] })

      let count = 0
      for (const r of rows) { count += r; if (count >= min) break }

      // Nothing worth hiding if the preview covers the grid, or leaves one card
      // behind: a control that reveals a single extra card costs the reader more
      // than just showing it.
      setPreview(count >= items.length - 1 ? null : count)
    }

    measure()
    let t: number
    const onResize = () => { window.clearTimeout(t); t = window.setTimeout(measure, 150) }
    window.addEventListener('resize', onResize)
    return () => { window.clearTimeout(t); window.removeEventListener('resize', onResize) }
  }, [min, children])

  // `hidden` rather than a class: it takes the extra cards out of the tab order
  // and the accessibility tree too, so a keyboard lands on the control rather
  // than in a stack of cards it cannot see.
  useEffect(() => {
    const el = grid.current
    if (!el) return
    const items = Array.from(el.children) as HTMLElement[]
    items.forEach((n, i) => {
      n.hidden = preview !== null && !expanded && i >= preview
    })
    if (expanded) {
      requestAnimationFrame(() => items.forEach((n) => n.classList.add('is-in')))
    }
  }, [preview, expanded])

  const label = expanded ? 'Show fewer' : `${href ? 'See' : 'Show'} all ${total}`

  return (
    <>
      <div className={className} ref={grid} id={id}>{children}</div>

      {preview !== null && (
        <div className="more-row">
          {href && !gated ? (
            <Link className="btn btn--ghost more-btn" href={href}>
              <span>{label}</span><Icon name="arrow-right" />
            </Link>
          ) : href && gated ? (
            <>
              <Link className="btn btn--ghost more-btn" href={href}>
                <span>{label}</span><Icon name="shield" />
              </Link>
              <p className="more-note text-sm muted">
                Members only — you will be asked for your registered number.
              </p>
            </>
          ) : (
            <button className="btn btn--ghost more-btn" type="button"
                    aria-expanded={expanded} aria-controls={id}
                    onClick={() => setExpanded((v) => !v)}>
              <span>{label}</span><Icon name="chevron-down" />
            </button>
          )}
        </div>
      )}
    </>
  )
}
