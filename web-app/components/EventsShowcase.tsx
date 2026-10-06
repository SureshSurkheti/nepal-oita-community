'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LocaleLink as Link } from './LocaleLink'
import { Icon } from './Sprite'
import { useI18n } from '@/lib/useI18n'
import { localeNum } from '@/lib/i18n'
import { CoverImage } from './CoverImage'
import { fallbackCoverFor } from '@/lib/covers'
import { categoryLabel } from '@/lib/dictionaries'

/* What the showcase needs. Deliberately NOT the whole EventRow.
 *
 * The header's copy of this list is serialised into the HTML of EVERY page, so
 * `body` — the long write-up on the event's own page — is dropped: carrying it
 * site-wide to show a summary nobody has opened yet would be the biggest thing
 * in the payload. The detail link is right there for anybody who wants it. */
export type ShowcaseEvent = {
  slug: string
  title: string
  summary: string | null
  dateLabel: string
  month: string
  day: string
  start_time: string | null
  end_time: string | null
  place: string | null
  category: string | null
  accent: string
  cover: string | null
  highlights: string[]
  past: boolean
}

const ART = ['art-rays', 'art-wave', 'art-lattice', 'art-dots']

/* ------------------------------------------------------------------ modal */

/* The full-screen view, separate from whatever opens it.
 *
 * Two callers share it and they carry different lists on purpose. The header
 * sends only what is COMING UP: its badge counts exactly that, and its copy
 * rides inside every page on the site, so it has to stay small — all ten events
 * measured 1.85 KB gzipped on a 13.7 KB page, which is a lot to spend on a
 * popup most visitors never open. The events page sends the whole timeline,
 * where it costs nothing because the page has already loaded it. */
export function EventsShowcase({ events, at, setAt }: {
  events: ShowcaseEvent[]
  at: number | null
  setAt: React.Dispatch<React.SetStateAction<number | null>>
}) {
  const { t, locale } = useI18n()
  const num = (n: number) => localeNum(n, locale)

  /* THIS MUST BE A PORTAL, and the reason is three separate bugs at once.
   *
   * The button that opens it lives in the header, so without a portal the whole
   * overlay is a child of `.nav` — which is `position: fixed` with
   * `height: var(--nav-h)`. The card was squashed into a 64px-tall sliver in the
   * corner. The nav also carries `z-index: 100`, which opens a stacking context,
   * so `z-index: 300` here only ever competed with the nav's own children rather
   * than covering the page. And `.nav.is-stuck` adds `backdrop-filter` once you
   * scroll — a filtered ancestor becomes the containing block for `position:
   * fixed`, so even a correctly sized overlay would have been pinned inside the
   * header from the first scroll.
   *
   * Portalling to <body> removes all three. Found by screenshotting it, not by
   * reading the CSS. */
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const move = (delta: number) =>
    setAt((i) => (i === null ? null : (i + delta + events.length) % events.length))

  /* Escape to leave, arrows to walk the list, and the page behind held still.
     The same contract as the gallery lightbox, so the two feel like one site. */
  useEffect(() => {
    if (at === null) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setAt(null)
      if (ev.key === 'ArrowLeft') move(-1)
      if (ev.key === 'ArrowRight') move(1)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, events.length])

  if (at === null || !mounted) return null
  const e = events[at]
  if (!e) return null

  return createPortal(
    <div className="evshow" role="dialog" aria-modal="true" aria-label={t.ui.whatsOn}>
      <div className="evshow__stage" onClick={(ev) => {
        if (ev.target === ev.currentTarget) setAt(null)
      }}>
        <button className="evshow__btn evshow__btn--close" type="button"
                aria-label={t.ui.closeShowcase} onClick={() => setAt(null)}>
          <Icon name="close" />
        </button>
        {events.length > 1 && (
          <>
            <button className="evshow__btn evshow__btn--prev" type="button"
                    aria-label={t.ui.previousEvent} onClick={() => move(-1)}>
              <Icon name="chevron-left" />
            </button>
            <button className="evshow__btn evshow__btn--next" type="button"
                    aria-label={t.ui.nextEvent} onClick={() => move(1)}>
              <Icon name="chevron-right" />
            </button>
          </>
        )}

        <article className={`evshow__card accent-${e.accent}${e.past ? ' evshow__card--past' : ''}`}>
          {/* The photograph when the committee has added one, and the same drawn
              pattern the cards use when they have not. At this size a grey box
              would be half the screen, so the fallback matters more here than
              anywhere else on the site. */}
          <div className={`evshow__media${e.cover ? ' evshow__media--photo' : ''}`}>
            <span className={`evshow__art ${ART[at % 4]}`} aria-hidden="true" />
            {e.cover && (
              <CoverImage className="evshow__img" src={e.cover} alt={e.title} priority
                          /* Half of a card that caps near 1100px, full width
                             once the card stacks on a phone. */
                          sizes="(max-width: 820px) 100vw, 560px"
                          fallback={fallbackCoverFor(e.slug)} />
            )}
            <div className="evshow__chip">
              <span className="evshow__chip-m">{e.month}</span>
              <span className="evshow__chip-d">{e.day}</span>
            </div>
            <span className={`evshow__flag${e.past ? ' evshow__flag--past' : ''}`}>
              {e.past ? t.ui.alreadyHappened : t.ui.comingUp}
            </span>
          </div>

          <div className="evshow__body">
            <h2 className="evshow__title">{e.title}</h2>
            <p className="evshow__when">
              <Icon name="calendar" /> {e.dateLabel}
              {e.start_time && (
                <>
                  <span className="evshow__dot" aria-hidden="true" />
                  {/* Icon and time in one nowrap span: as two flex children they
                      wrapped apart on a phone, leaving a clock at the end of one
                      line and its time at the start of the next. */}
                  <span className="evshow__time">
                    <Icon name="clock" />
                    {e.start_time}{e.end_time ? ` – ${e.end_time}` : ''}
                  </span>
                </>
              )}
            </p>
            {e.place && <p className="evshow__where"><Icon name="pin" /> {e.place}</p>}
            {e.summary && <p className="evshow__sum">{e.summary}</p>}
            {e.highlights.length > 0 && (
              <ul className="evshow__points">
                {e.highlights.map((h) => (
                  <li key={h}><Icon name="check" /><span>{h}</span></li>
                ))}
              </ul>
            )}
            <div className="evshow__foot">
              {e.category && <span className="tag">{categoryLabel(t, e.category)}</span>}
              <Link className="btn btn--primary" href={`/events/${e.slug}`}
                    onClick={() => setAt(null)}>
                {t.ui.details} <Icon name="arrow-right" />
              </Link>
            </div>
          </div>
        </article>

        <p className="evshow__count">{num(at + 1)} / {num(events.length)}</p>
      </div>
    </div>,
    document.body,
  )
}

/* --------------------------------------------- the events page's own button */

/* Opens the same view over the WHOLE timeline, starting on the first event
   still to come — which is where the rail below parks itself, so the two agree
   about where "now" is. */
export function EventsShowcaseButton({ events }: { events: ShowcaseEvent[] }) {
  const { t } = useI18n()
  const [at, setAt] = useState<number | null>(null)
  if (events.length === 0) return null
  const first = events.findIndex((e) => !e.past)

  return (
    <>
      <button className="btn btn--ghost" type="button"
              onClick={() => setAt(first === -1 ? 0 : first)}>
        <Icon name="expand" /> {t.ui.viewFullScreen}
      </button>
      <EventsShowcase events={events} at={at} setAt={setAt} />
    </>
  )
}
