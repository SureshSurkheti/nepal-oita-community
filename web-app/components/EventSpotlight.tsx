'use client'

import { useState } from 'react'
import { LocaleLink as Link } from './LocaleLink'
import { Icon } from './Sprite'
import { useI18n } from '@/lib/useI18n'
import { localeNum } from '@/lib/i18n'
import { categoryLabel } from '@/lib/dictionaries'
import { CoverImage } from './CoverImage'
import { EventsShowcase, type ShowcaseEvent } from './EventsShowcase'

/* The same event the showcase shows, plus how far away it is.
 *
 * `days` is a NUMBER WORKED OUT ON THE SERVER, against the date in Oita. It is
 * not recomputed here on purpose — see daysUntil() in lib/content. */
export type SpotlightEvent = ShowcaseEvent & { days: number }

const ART = ['art-rays', 'art-wave', 'art-lattice', 'art-dots']

/* WHAT IS ON NEXT, ON THE PAGE RATHER THAN OVER IT.
 *
 * This band replaced two things that both tried to do its job and both did it
 * badly: a notification badge in the header, and the popup-on-arrival that would
 * have been the obvious way to make an event unmissable.
 *
 * AGAINST THE POPUP, four reasons, in the order they cost something:
 *
 *   1. Google demotes a mobile page that covers its own content on arrival —
 *      the "intrusive interstitial" rule. This site exists to be found by
 *      somebody typing "nepali community oita". Ranking is the one thing it
 *      cannot trade for decoration.
 *   2. A popup is seen once and dismissed. The next festival is the most useful
 *      fact on the page, and the popup pattern guarantees it is visible for
 *      about four seconds and then never again.
 *   3. It cannot be linked to, shared, screenshotted or read by a crawler as
 *      part of the page. A band can: the date and the place are in the HTML.
 *   4. Somebody arriving from a search for the festival itself gets a box
 *      between them and the thing they came for, and has to dismiss it to read
 *      what they were already looking for.
 *
 * So the full-screen view the committee wanted is still here, in full, and it is
 * genuinely the best-looking thing on the site — it just opens when somebody
 * ASKS for it, from the button below. An invited popup is a feature; an
 * uninvited one is a toll gate.
 *
 * AGAINST THE HEADER BADGE: it was a 40px icon competing for the tightest row on
 * the site — it is what pushed the menu button off-screen on every phone between
 * 361 and 429px — and it was a second route to a page the nav already links to.
 * This band is the same information at twenty times the size, in the place
 * somebody is already looking, and it costs the header nothing. */
export function EventSpotlight({ events }: { events: SpotlightEvent[] }) {
  const { t, locale } = useI18n()
  const [at, setAt] = useState<number | null>(null)

  /* Rendered only when there is genuinely something to announce. An empty
     "coming up" band is worse than no band: it says the community has stopped. */
  if (events.length === 0) return null

  const e = events[0]
  const rest = events.slice(1)

  const countdown = e.days <= 0 ? t.spotlight.today
    : e.days === 1 ? t.spotlight.tomorrow
    : t.spotlight.inDays.replace('{n}', localeNum(e.days, locale))

  return (
    <section className={`spot accent-${e.accent}`} id="next" aria-labelledby="spot-title">
      <div className="container">
        <div className="spot__card reveal">
          {/* The poster, or the drawn pattern when the committee has not added
              one yet. CoverImage is what makes a printed bill work here: a
              1024x1536 poster cropped to this frame would keep the sponsor strip
              and throw away the title and the date. */}
          <div className={`spot__media${e.cover ? ' spot__media--photo' : ''}`}>
            <span className={`spot__art ${ART[0]}`} aria-hidden="true" />
            {e.cover && <CoverImage className="spot__img" src={e.cover} alt={e.title} priority />}
            <div className="spot__chip">
              <span className="spot__chip-m">{e.month}</span>
              <span className="spot__chip-d">{e.day}</span>
            </div>
          </div>

          <div className="spot__body">
            <p className="spot__eyebrow">
              <span className="spot__pulse" aria-hidden="true" />
              {t.ui.comingUp}
              <span className="spot__countdown">{countdown}</span>
            </p>

            <h2 className="spot__title" id="spot-title">{e.title}</h2>

            <p className="spot__when">
              <Icon name="calendar" /> {e.dateLabel}
              {e.start_time && (
                <>
                  <span className="spot__dot" aria-hidden="true" />
                  {/* Icon and time in one nowrap span. As two flex children they
                      wrap apart on a phone, leaving a clock at the end of one
                      line and its time at the start of the next. */}
                  <span className="spot__time">
                    <Icon name="clock" />
                    {e.start_time}{e.end_time ? ` – ${e.end_time}` : ''}
                  </span>
                </>
              )}
            </p>
            {e.place && <p className="spot__where"><Icon name="pin" /> {e.place}</p>}
            {e.summary && <p className="spot__sum">{e.summary}</p>}

            <div className="spot__actions">
              <button className="btn btn--primary" type="button" onClick={() => setAt(0)}>
                <Icon name="expand" /> {t.spotlight.open}
              </button>
              <Link className="btn btn--ghost" href={`/events/${e.slug}`}>
                {t.ui.details} <Icon name="arrow-right" />
              </Link>
              {e.category && <span className="tag">{categoryLabel(t, e.category)}</span>}
            </div>
          </div>
        </div>

        {/* The rest of what is booked, each opening the showcase ON ITSELF
            rather than at the top of the list — pressing "Nepali Festival"
            and landing on the Kabaddi would read as a broken button. */}
        {rest.length > 0 && (
          <div className="spot__more">
            <p className="spot__more-label">{t.spotlight.also}</p>
            <div className="spot__more-row">
              {rest.map((o, i) => (
                <button className="spot__pill" type="button" key={o.slug}
                        onClick={() => setAt(i + 1)}>
                  <span className="spot__pill-date">
                    <span>{o.month}</span><strong>{o.day}</strong>
                  </span>
                  <span className="spot__pill-text">
                    <span className="spot__pill-title">{o.title}</span>
                    {o.place && <span className="spot__pill-meta">{o.place}</span>}
                  </span>
                </button>
              ))}
              <Link className="spot__pill spot__pill--all" href="/events">
                <span className="spot__pill-text">
                  <span className="spot__pill-title">{t.spotlight.allEvents}</span>
                </span>
                <Icon name="arrow-right" />
              </Link>
            </div>
          </div>
        )}
      </div>

      <EventsShowcase events={events} at={at} setAt={setAt} />
    </section>
  )
}
