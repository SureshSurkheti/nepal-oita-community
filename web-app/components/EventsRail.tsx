'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from './Sprite'

/* The events timeline, as a pager.
 *
 * It was a horizontal scroller, then a scroller with the scrolling switched off
 * and arrows that called scrollBy. That second state was the worst of both: no
 * scrollbar and no drag, but still a scroll position — so a click could leave a
 * card half out of frame, and the only thing that could put it right was another
 * click in the same direction.
 *
 * There is no scroll container here at all. Every event is in the DOM; the ones
 * not on the current page carry `hidden`, which takes them out of the tab order
 * and the accessibility tree as well as off the screen. The arrows move a whole
 * page, so a card is either fully shown or not shown.
 *
 * How many fit is asked of the browser rather than worked out: the track is a
 * grid of `auto-fill` columns, so counting the columns it resolved to gives the
 * page size at any width, for free, and it stays right through a resize without
 * anybody maintaining a table of breakpoints.
 */
export function EventsRail({
  children,
  upcomingIndex,
  pastCount,
}: {
  children: React.ReactNode
  /** Index of the first event still to come, or -1 if there are none. */
  upcomingIndex: number
  pastCount: number
}) {
  const track = useRef<HTMLDivElement>(null)
  const [perPage, setPerPage] = useState(0)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  // Set once, from the first measurement: opening on the next event to come is
  // the point of the ordering, but after that the page belongs to the reader.
  const anchored = useRef(false)

  useEffect(() => {
    const el = track.current
    if (!el) return

    const measure = () => {
      const items = Array.from(el.children) as HTMLElement[]
      setTotal(items.length)

      /* Count the columns the grid actually resolved to. Measured with
         everything shown, because a grid whose only child is visible reports one
         column however many would fit — which would pin the page size at 1. */
      const wasHidden = items.map((n) => n.hidden)
      items.forEach((n) => { n.hidden = false })
      const columns = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length
      items.forEach((n, i) => { n.hidden = wasHidden[i] })

      const size = Math.max(1, columns)
      setPerPage(size)

      if (!anchored.current && upcomingIndex >= 0) {
        setPage(Math.floor(upcomingIndex / size))
        anchored.current = true
      }
    }

    measure()
    let t: number
    const onResize = () => { window.clearTimeout(t); t = window.setTimeout(measure, 150) }
    window.addEventListener('resize', onResize)
    return () => { window.clearTimeout(t); window.removeEventListener('resize', onResize) }
  }, [upcomingIndex, children])

  // Applied in its own effect so it re-runs on a page change without re-measuring.
  useEffect(() => {
    const el = track.current
    if (!el || perPage === 0) return
    const items = Array.from(el.children) as HTMLElement[]
    items.forEach((n, i) => {
      n.hidden = i < page * perPage || i >= (page + 1) * perPage
    })
  }, [page, perPage, total])

  const pages = perPage > 0 ? Math.ceil(total / perPage) : 1
  // Clamp rather than let a resize leave the reader on a page that no longer
  // exists, which shows an empty row and two dead arrows.
  useEffect(() => {
    if (page > pages - 1) setPage(Math.max(0, pages - 1))
  }, [page, pages])

  const atStart = page === 0
  const atEnd = page >= pages - 1

  return (
    <>
      <div className="rail-bar">
        <p className="text-sm muted rail-hint">
          {pages > 1 && (
            <>
              Page {page + 1} of {pages}
              {/* Not "to the left" any more. That was true of a strip you could
                  slide; with a pager the earlier events are on the pages behind
                  you, and telling somebody to look left at a card that is not
                  rendered is worse than saying nothing. */}
              {pastCount > 0 && upcomingIndex >= 0 && ' · earlier events are on the pages before this'}
            </>
          )}
        </p>
        {pages > 1 && (
          <div className="rail-nav">
            <button className="icon-btn rail-arrow" type="button" disabled={atStart}
                    aria-label="Earlier events" onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <Icon name="chevron-left" />
            </button>
            <button className="icon-btn rail-arrow" type="button" disabled={atEnd}
                    aria-label="Later events" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>
              <Icon name="chevron-right" />
            </button>
          </div>
        )}
      </div>

      <div className="rail" ref={track}>{children}</div>
    </>
  )
}
