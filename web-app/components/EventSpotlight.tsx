'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from './Sprite'
import { useI18n } from '@/lib/useI18n'
import { localeNum } from '@/lib/i18n'
import { fallbackCoverFor } from '@/lib/covers'
import { EventsShowcase, type ShowcaseEvent } from './EventsShowcase'
import { CoverImage } from './CoverImage'

/* The same event the showcase shows, plus how far away it is.
 *
 * `days` is a NUMBER WORKED OUT ON THE SERVER, against the date in Oita. It is
 * not recomputed here on purpose — see daysUntil() in lib/content. */
export type SpotlightEvent = ShowcaseEvent & { days: number }

/* How long each event holds before the ribbon moves on.
 *
 * Longer than the hero's 7s rotation behind it, deliberately: that one changes a
 * photograph nobody is reading, this one changes a date somebody might be. Six
 * seconds is roughly twice as long as it takes to read "Saturday 28 November,
 * Oita Cultural Hall", which leaves room to finish the line and look at it
 * again. It is also deliberately NOT a multiple of 7, so the two rotations drift
 * against each other instead of changing in lockstep — two things moving at once
 * reads as a glitch. */
const HOLD = 6000

/* WHAT IS ON NEXT, IN THE FIRST SCREEN, WITHOUT COVERING IT.
 *
 * This is the third place this information has lived, and the two it replaced
 * are both worth recording so neither comes back.
 *
 * NOT A POPUP ON ARRIVAL. Google demotes a mobile page that covers its own
 * content on arrival — the "intrusive interstitial" rule — and being found by
 * somebody typing "nepali community oita" is the one thing this site cannot
 * trade for decoration. A popup is also seen once and dismissed, so the most
 * useful fact on the page would be visible for four seconds and then never
 * again; it cannot be linked to, shared or read by a crawler; and somebody
 * arriving from a search for the festival itself would get a box between them
 * and the thing they came for.
 *
 * NOT A BADGE IN THE HEADER. It was a 40px icon competing for the tightest row
 * on the site — it is what pushed the menu button off-screen on every phone
 * between 361 and 429px — and it was a second route to a page the nav links to.
 *
 * NOT A BAND BELOW THE HERO. The hero is min-height 100svh, so a band underneath
 * began exactly one screen down and only existed for people who scrolled.
 *
 * So it rides in the hero, in the strip above the statistics. The big view the
 * committee asked for is still here, behind the button. An invited popup is a
 * feature; an uninvited one is a toll gate.
 */
export function EventSpotlight({ events }: { events: SpotlightEvent[] }) {
  const { t, locale } = useI18n()
  const [at, setAt] = useState<number | null>(null)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [still, setStill] = useState(true)
  const region = useRef<HTMLDivElement>(null)

  /* Motion is decided in the browser, never in the markup.
   *
   * The server has no idea what the viewer has asked their operating system
   * for, so it always renders the still version: no rotation, no sheen. The
   * browser turns movement on afterwards if it is welcome. Doing it the other
   * way round — assume motion, remove it on mount — means somebody who asked
   * for no animation watches one play before it stops, which is the whole thing
   * they asked not to happen. */
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setStill(q.matches)
    read()
    q.addEventListener('change', read)
    return () => q.removeEventListener('change', read)
  }, [])

  /* Every cover decoded before it is ever shown.
   *
   * Without this the first rotation swaps `src` on an image the browser has not
   * fetched, so the frame goes empty for as long as the request takes and the
   * ribbon appears to flicker. Three images, requested once, after the rest of
   * the page has settled. */
  useEffect(() => {
    if (events.length < 2) return
    const imgs = events.slice(1).map((e) => {
      const img = new Image()
      img.src = e.cover ?? ''
      return img
    })
    return () => { imgs.forEach((img) => { img.src = '' }) }
  }, [events])

  /* Advance. Stopped entirely while a finger or a cursor is on the ribbon, while
     the keyboard focus is inside it, while the tab is in the background, and for
     anybody who has asked for less motion. A control that keeps moving under the
     pointer is one you cannot press. */
  useEffect(() => {
    if (still || paused || events.length < 2 || at !== null) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      setI((n) => (n + 1) % events.length)
    }, HOLD)
    return () => window.clearInterval(id)
  }, [still, paused, events.length, at])

  /* Rendered only when there is genuinely something to announce. An empty
     "coming up" ribbon is worse than no ribbon: it says the community has
     stopped, and it would cost the hero 90px to say it. */
  if (events.length === 0) return null

  const e = events[Math.min(i, events.length - 1)]

  const countdown = e.days <= 0 ? t.spotlight.today
    : e.days === 1 ? t.spotlight.tomorrow
    : t.spotlight.inDays.replace('{n}', localeNum(e.days, locale))

  return (
    <>
      <div
        ref={region}
        className={`spot accent-${e.accent}${still ? ' spot--still' : ''}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        /* The pointer is what pauses it on a phone — there is no hover — so a
           touch anywhere on the ribbon holds it still long enough to read. */
        onTouchStart={() => setPaused(true)}
      >
        {/* Keyed by index so React replaces these two rather than mutating them,
            which is what lets one CSS animation play the cross-fade on every
            change without a transition group or a second copy in the DOM. */}
        <div className="spot__media" key={`m${i}`}>
          {e.cover && (
            /* eslint-disable-next-line @next/next/no-img-element */
            /* fit="cover" rather than the default: this frame is barely wider
               than it is tall, so showing a film bill whole would shrink it to
               an unreadable stamp between two bars. Cropping is right at this
               size.

               CoverImage rather than a bare <img> with an onError, which is what
               this was first. The handler never fired: the image is in the
               server-rendered HTML, so it had already failed by the time React
               hydrated and attached the handler — the exact trap this component
               documents and already solves by asking the element directly on
               mount. Measured: a deliberately broken cover stayed broken with
               the inline handler and repairs itself with this. */
            <CoverImage className="spot__img" src={e.cover} alt="" fit="cover"
                        fallback={fallbackCoverFor(e.slug)} />
          )}
          <span className="spot__shade" aria-hidden="true" />
          <div className="spot__chip">
            <span className="spot__chip-m">{e.month}</span>
            <span className="spot__chip-d">{e.day}</span>
          </div>
        </div>

        <div className="spot__text" key={`t${i}`}>
          <p className="spot__eyebrow">
            <span className="spot__pulse" aria-hidden="true" />
            {t.ui.comingUp}
            <span className="spot__countdown">{countdown}</span>
          </p>
          <h2 className="spot__title">{e.title}</h2>
          {/* Date, time and place on ONE line, each with its own icon. Three
              stacked lines is what a card does; the hero has a height budget and
              this has to survive a 1366x650 laptop with the statistics still
              below it. They wrap as whole units on a narrow screen. */}
          <p className="spot__meta">
            <span><Icon name="calendar" />{e.dateLabel}</span>
            {e.start_time && (
              <span>
                <Icon name="clock" />
                {e.start_time}{e.end_time ? ` – ${e.end_time}` : ''}
              </span>
            )}
            {e.place && <span><Icon name="pin" />{e.place}</span>}
          </p>
        </div>

        <div className="spot__side">
          {/* One control, not two. "Details" belonged on a card with room for
              it; here a second button would make the ribbon a toolbar, and the
              showcase it opens carries its own Details link to the same page.
              It opens on whichever event is showing, so what you press is what
              you get. */}
          <button className="btn btn--primary spot__go" type="button" onClick={() => setAt(i)}>
            <Icon name="expand" /> {t.spotlight.open}
          </button>

          {/* The dots are the reason the rotation is allowed to exist. Anything
              that moves on its own has to be steerable, or somebody who looked
              away has no way back to what they were reading. */}
          {events.length > 1 && (
            <div className="spot__dots">
              {events.map((o, n) => (
                <button key={o.slug} type="button"
                        className={`spot__dot${n === i ? ' is-on' : ''}`}
                        aria-label={o.title}
                        aria-current={n === i ? 'true' : undefined}
                        onClick={() => setI(n)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <EventsShowcase events={events} at={at} setAt={setAt} />
    </>
  )
}
