'use client'

import { useState } from 'react'
import { Icon } from './Sprite'
import { useI18n } from '@/lib/useI18n'
import { localeNum } from '@/lib/i18n'
import { EventsShowcase, type ShowcaseEvent } from './EventsShowcase'

/* The same event the showcase shows, plus how far away it is.
 *
 * `days` is a NUMBER WORKED OUT ON THE SERVER, against the date in Oita. It is
 * not recomputed here on purpose — see daysUntil() in lib/content. */
export type SpotlightEvent = ShowcaseEvent & { days: number }

/* WHAT IS ON NEXT, IN THE FIRST SCREEN, WITHOUT COVERING IT.
 *
 * This is the third place this information has lived in a day, and the two it
 * replaced are both worth recording so neither comes back.
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
 * between 361 and 429px — and it was a second route to a page the nav already
 * links to.
 *
 * NOT A BAND BELOW THE HERO EITHER, which is where this started. It was the best
 * looking of the three and nobody saw it: the hero is min-height 100svh, so the
 * band began exactly one screen down and only existed for people who scrolled.
 *
 * So it rides in the hero itself, in the strip above the statistics, where the
 * eye already ends up. It is a RIBBON rather than a card because that strip has
 * a height budget — the hero is one viewport and already carries a headline, a
 * lede, two buttons and four figures — and because at this size it can state the
 * date, the time and the place in one line each without pushing anything off a
 * short laptop screen.
 *
 * The big view the committee asked for is still here, in full, behind the
 * button. An invited popup is a feature; an uninvited one is a toll gate. */
export function EventSpotlight({ events }: { events: SpotlightEvent[] }) {
  const { t, locale } = useI18n()
  const [at, setAt] = useState<number | null>(null)

  /* Rendered only when there is genuinely something to announce. An empty
     "coming up" ribbon is worse than no ribbon: it says the community has
     stopped, and it would cost the hero 90px to say it. */
  if (events.length === 0) return null

  const e = events[0]
  const more = events.length - 1

  const countdown = e.days <= 0 ? t.spotlight.today
    : e.days === 1 ? t.spotlight.tomorrow
    : t.spotlight.inDays.replace('{n}', localeNum(e.days, locale))

  return (
    <>
      <div className={`spot accent-${e.accent}`}>
        {/* The chip is the same object as the one on every event card and in the
            showcase, at the same proportions — somebody who has seen one here
            recognises it there. */}
        <div className="spot__chip">
          <span className="spot__chip-m">{e.month}</span>
          <span className="spot__chip-d">{e.day}</span>
        </div>

        <div className="spot__text">
          <p className="spot__eyebrow">
            <span className="spot__pulse" aria-hidden="true" />
            {t.ui.comingUp}
            <span className="spot__countdown">{countdown}</span>
            {more > 0 && (
              <span className="spot__more">
                {t.spotlight.more.replace('{n}', localeNum(more, locale))}
              </span>
            )}
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

        {/* One control, not two. "Details" belonged on a card with room for it;
            here a second button would make the ribbon a toolbar, and the
            showcase it opens carries its own Details link to the same page. */}
        <button className="btn btn--primary spot__go" type="button" onClick={() => setAt(0)}>
          <Icon name="expand" /> {t.spotlight.open}
        </button>
      </div>

      <EventsShowcase events={events} at={at} setAt={setAt} />
    </>
  )
}
