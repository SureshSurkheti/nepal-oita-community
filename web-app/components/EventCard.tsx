import Link from 'next/link'
import { Icon } from './Sprite'
import { chipDate, type EventRow } from '@/lib/content'

export function EventCard({ event }: { event: EventRow }) {
  const { month, day } = chipDate(event.event_date)
  return (
    <article
      className={`card card--feature accent-${event.accent} event reveal${event.past ? ' event--past' : ''}`}
    >
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
        {event.category && <span className="tag">{event.category}</span>}
        <Link className="link-arrow" href={`/events/${event.slug}`}>
          Details <Icon name="arrow-right" />
        </Link>
      </div>
    </article>
  )
}
