'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from './Sprite'
import { useI18n } from '@/lib/useI18n'
import { localeNum } from '@/lib/i18n'
import { categoryLabel } from '@/lib/dictionaries'
import { EventsShowcase, type ShowcaseEvent } from './EventsShowcase'
import Image from 'next/image'

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

  /* NO PRELOAD, AND THAT IS THE SECOND VERSION OF THIS DECISION.
   *
   * The first one warmed every other event's cover on mount so the rotation
   * would not flicker. Measured, that fetched the RAW files — 461KB of
   * festival.jpg for a 150px frame nobody had looked at yet — and put them on
   * the critical path of the home page. Deferring it to `load` fixed the
   * critical path and still spent the 461KB.
   *
   * It is not needed any more. The covers go through next/image now, so the
   * rotation swaps to a ~55KB resized copy instead of a quarter-megabyte
   * poster, and the frame it paints into already carries the event's accent
   * wash — so the worst case is a tinted panel for a moment rather than a hole.
   * Six seconds of idle time before the first change is plenty for 55KB. */

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

  /* The countdown is the one thing on this band that changes by itself, and the
     only reason anybody feels a date is near. It was a grey pill the size of the
     eyebrow; it is now the second-largest thing in the row after the title. */
  const soon = e.days <= 0 || e.days === 1
  const countdownWord = e.days <= 0 ? t.spotlight.today : t.spotlight.tomorrow

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
        {/* The event's own colours, bleeding across the band.
            
            It is the poster at 64px under a heavy blur — about 2KB, and the same
            file the thumbnail already fetched, so it costs a cache hit rather
            than a request. The point is that the band belongs to the thing it is
            announcing: a film bill tints it differently from a festival. The
            veil over it is not decoration, it is what keeps the words readable.
            Measured off the rendered pixels, not estimated: the title is 15.4:1
            against the tinted panel and the summary 7.4:1, where 4.5 is the
            floor. Re-measure if the veil is ever lightened — the tint comes from
            the artwork, so it is darker for some events than others. */}
        {e.cover && (
          <span className="spot__glow" aria-hidden="true">
            <Image src={e.cover} alt="" fill sizes="64px" />
          </span>
        )}

        {/* Keyed by index so React replaces these two rather than mutating them,
            which is what lets one CSS animation play the cross-fade on every
            change without a transition group or a second copy in the DOM. */}
        <div className="spot__media" key={`m${i}`}>
          {e.cover && (
            /* eslint-disable-next-line @next/next/no-img-element */
            /* next/image, and the reason is a measured regression.
               
               This frame is about 150px wide. It was serving the file whole —
               the Kabaddi bill is 1024x1536 and 241KB — and because the ribbon
               sits at the top of the home page, that made a poster scaled down
               by a factor of ten the LARGEST CONTENTFUL PAINT of the whole site:
               5.7s on Slow 4G, where Google calls anything over 4s poor. Next's
               optimiser resizes and re-encodes it to the size actually drawn.
               
               `sizes` has to match the CSS or the whole thing is pointless.
               .spot__media is now clamp(92px, 8.4vw, 116px) with an explicit
               2:3 ratio, and 86px below 820px — it was re-sized when the frame
               was given the poster's own shape, because a frame that is taller
               than it is wide needs fewer horizontal pixels, not more. Told
               that, the browser fetches roughly a 116px-wide copy instead of a
               1024px one.
               
               `priority` because this IS the element above the fold; now that
               it is a few KB rather than a quarter of a megabyte, asking for it
               early is the right trade rather than the wrong one.
               
               fit="cover" is the behaviour kept from CoverImage: this frame is
               barely wider than it is tall, so showing a film bill whole would
               shrink it to an unreadable stamp between two bars. */
            <Image
              className="spot__img"
              src={e.cover}
              alt=""
              fill
              sizes="(max-width: 820px) 86px, 116px"
              priority
              /* NO onError HANDLER, AND THAT IS DELIBERATE — it was here and it
                 cost 257KB a page view.
                 
                 A srcset gives the browser several candidates; it starts one,
                 picks another, and ABORTS the first. That abort fires `error`.
                 Measured: twelve net::ERR_ABORTED in eight seconds on this page,
                 every one of them normal, and each made the handler swap a
                 perfectly good optimised image for the raw fallback file. The
                 ribbon also remounts its media every six seconds as it rotates,
                 which guarantees more of them.
                 
                 There is nothing to recover anyway: the frame already carries
                 the event's accent wash, so a cover that genuinely fails leaves
                 a tinted panel rather than a hole. The cards, the showcase and
                 the event page keep their fallback — CoverImage decides by
                 asking the element whether it actually failed, rather than by
                 trusting an event that fires for a request that was merely
                 replaced. */
            />
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
            {e.category && <span className="spot__tag">{categoryLabel(t, e.category)}</span>}
          </p>
          <h2 className="spot__title">{e.title}</h2>
          {/* The countdown block beside this is aria-hidden, because it is the
              same fact as the date below in a louder voice. Said once here, for
              anybody listening rather than looking. */}
          <span className="visually-hidden">
            {soon ? countdownWord : t.spotlight.inDays.replace('{n}', localeNum(e.days, locale))}
          </span>
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
            {e.place && <span className="spot__where"><Icon name="pin" />{e.place}</span>}
          </p>
          {/* The sentence that does the inviting. It was fetched, carried across
              the network and then not rendered — the band showed a date and a
              title, which tells somebody an event exists but nothing about
              whether it is for them. One line, clipped, never wrapping past it. */}
          {e.summary && <p className="spot__sum">{e.summary}</p>}
        </div>

        {/* The count, in the space the old layout left empty. On a wide screen
            the row ran title + date and then a hand's width of nothing before
            the button. */}
        <div className="spot__count" aria-hidden="true">
          {soon ? (
            <span className="spot__count-word">{countdownWord}</span>
          ) : (
            <>
              <span className="spot__count-n">{localeNum(e.days, locale)}</span>
              <span className="spot__count-l">{t.spotlight.daysLabel}</span>
            </>
          )}
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
