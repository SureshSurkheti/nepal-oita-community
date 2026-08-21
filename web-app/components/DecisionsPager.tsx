'use client'

import { Children, useEffect, useRef, useState } from 'react'
import { Icon } from './Sprite'

/* The meeting decisions on the homepage: the newest write-up, and buttons for the
 * earlier ones.
 *
 * WHY NOT A SCROLLER
 * This was a sideways scroll container with snapping and arrows that nudged it by
 * exactly one card. It worked, and it was still wrong twice over. A strip always
 * has a card cut off at the container edge, which reads as a clipping bug however
 * softly it is faded — and to fit three abreast, the newest write-up, the one
 * nearly everybody has come for, was squeezed into a 250px column so that two
 * they had already read could sit beside it.
 *
 * So there is no scroll container at all. One card is in the DOM at a time and it
 * gets the whole measure; the arrows step between them.
 *
 * RENDERING ONE CHILD RATHER THAN HIDING THE REST
 * The events pager next door keeps every card mounted and sets `hidden` on the
 * ones off-page, because it has to measure the grid to work out how many fit.
 * Nothing here needs measuring — the page size is one — so the off-screen cards
 * are simply not rendered. That is the stronger version: `hidden` is one author
 * `display` rule away from being ignored, which is a bug this theme has already
 * had, and an unrendered card cannot be read out by a screen reader or reached by
 * a stray tab either.
 */
export function DecisionsPager({ children, label }: {
  children: React.ReactNode
  /** Names the region for a screen reader — the card itself changes under it. */
  label: string
}) {
  const items = Children.toArray(children)
  const total = items.length

  /* Opens on the newest. The page passes them oldest-first, so that is the last
     one — and it means the left arrow steps backwards in time, which is the way
     round somebody expects without being told. */
  const [i, setI] = useState(total - 1)

  // A shorter list after a revalidate must not leave the index past the end.
  useEffect(() => { setI((n) => Math.min(n, total - 1)) }, [total])

  const box = useRef<HTMLDivElement>(null)

  /* Which decision lists are actually clipped by the card's ceiling. Re-run on
     every step, because the answer belongs to the card now on screen and not to
     the one before it. A fade over the last line of a short list reads as a
     rendering bug, so it is applied only where there is really more below. */
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('.decision__points')
    if (!el) return
    el.classList.toggle('is-clipped', el.scrollHeight - el.clientHeight > 2)
  }, [i])

  const atOldest = i === 0
  const atNewest = i === total - 1

  return (
    <>
      {total > 1 && (
        <div className="rail-bar">
          <p className="text-sm muted rail-hint">
            {atNewest
              ? `The most recent of ${total} — the arrows step back through the earlier ones.`
              : `${i + 1} of ${total}, oldest first.`}
          </p>
          <div className="rail-nav">
            <button className="icon-btn rail-arrow" type="button" disabled={atOldest}
                    aria-label="Earlier meeting" onClick={() => setI((n) => Math.max(0, n - 1))}>
              <Icon name="chevron-left" />
            </button>
            <button className="icon-btn rail-arrow" type="button" disabled={atNewest}
                    aria-label="Later meeting" onClick={() => setI((n) => Math.min(total - 1, n + 1))}>
              <Icon name="chevron-right" />
            </button>
          </div>
        </div>
      )}

      {/* aria-live, because pressing an arrow replaces the whole content of this
          region and the button that did it stays put — without it a screen
          reader reports nothing at all happening. Polite, not assertive: it is a
          reader's own navigation, not an alert. */}
      <div className="decisions" ref={box} role="group" aria-label={label}
           aria-live="polite">
        {items[i]}
      </div>
    </>
  )
}
