import { LocaleLink as Link } from './LocaleLink'
import { Icon } from './Sprite'
import { chipDate, coverFor, type EventRow } from '@/lib/content'
import { fallbackCoverFor } from '@/lib/covers'
import { CoverImage } from './CoverImage'
import { getDictionary, categoryLabel } from '@/lib/dictionaries'
import type { Locale } from '@/lib/i18n'

const ART = ['art-rays', 'art-wave', 'art-lattice', 'art-dots']

export function EventCard({ event, index = 0, lang }: {
  event: EventRow; index?: number; lang: Locale
}) {
  const { month, day } = chipDate(event.event_date)
  const t = getDictionary(lang)
  /* Never null now: an event with no cover of its own borrows one of the
     site's own photographs rather than falling back to a drawn pattern.
     See lib/covers. */
  const cover = coverFor(event.slug, event.cover_path)
  return (
    <article
      className={`card card--feature accent-${event.accent} event reveal${event.past ? ' event--past' : ''}`}
    >
      {/* The photograph, when there is one. An event with no cover falls back to
          the same drawn pattern the gallery tiles use rather than a grey box or
          a gap — a card with a hole in it reads as broken, and the committee
          should be able to add an event in thirty seconds without hunting for an
          image first. The date chip sits ON the media when a photo is present,
          which is where somebody looks for it. */}
      <div className={`event__media${cover ? ' event__media--photo' : ''}`}>
        <span className={`event__art ${ART[index % 4]}`} aria-hidden="true" />
        {cover && (
          <>
            {/* CoverImage rather than a bare <img>, for two things it knows that
                a plain tag does not: a printed poster is shown whole instead of
                cropped to a strip of its sponsor logos, and a cover that fails
                to load is replaced rather than leaving a broken-image glyph on
                the card. See lib/covers. */}
            <CoverImage className="event__img" src={cover} alt=""
                        /* THE DECLARED WIDTH CAPS THE EFFECTIVE PIXEL RATIO AT
                           ABOUT 2, AND THAT IS THE POINT. The card is drawn 361
                           CSS px wide on a phone. Declared honestly, a DPR-3
                           screen asks for 1083 and the browser takes the 1200
                           step: measured, 231KB for ONE card, and the rail is
                           horizontal so every cover loads without scrolling —
                           958KB of photographs before anybody has moved.
                           Declaring 62vw lands on 750 instead, which is 101KB
                           and still 2.08x the drawn size. Three times is a
                           ceiling worth paying for text and line art; for a
                           photograph in a small card nobody can see it. */
                        sizes="(max-width: 900px) 62vw, 380px"
                        fallback={fallbackCoverFor(event.slug)} />
            {/* Only when there IS a photo. Without one the card keeps its
                original layout, where the chip sits beside the title — moving it
                onto an empty pattern would put a date on nothing. The chip in
                `.event__top` is hidden by CSS in this case so there is never
                two of them. */}
            <div className="datechip datechip--on-media">
              <span className="datechip__m">{month}</span>
              <span className="datechip__d">{day}</span>
            </div>
          </>
        )}
      </div>

      <div className="event__top">
        <div className="datechip">
          <span className="datechip__m">{month}</span>
          <span className="datechip__d">{day}</span>
        </div>
        <div>
          <h3 className="card__title">{event.title}</h3>
          {event.summary && <p className="card__body">{event.summary}</p>}
        </div>
      </div>
      <div className="event__meta">
        {event.place && <span><Icon name="pin" />{event.place}</span>}
        {event.start_time && (
          <span>
            <Icon name="clock" />
            {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
          </span>
        )}
      </div>
      <div className="event__foot">
        {event.category && <span className="tag">{categoryLabel(t, event.category)}</span>}
        <Link className="link-arrow" href={`/events/${event.slug}`}>
          {t.ui.details} <Icon name="arrow-right" />
        </Link>
      </div>
    </article>
  )
}
