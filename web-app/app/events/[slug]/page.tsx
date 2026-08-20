import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Icon } from '@/components/Sprite'
import { getEvent, getEvents, longDate } from '@/lib/content'

/* One route replaces the ten hand-written event-*.html files. Adding an event is
   now a database row, not a new file that somebody has to remember to create —
   which is how the static site ended up with a Details link that would 404 if
   you forgot. */

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) return { title: 'Event not found' }
  const description = event.body ?? event.summary ?? undefined
  return {
    title: event.title,
    description,
    openGraph: { title: event.title, description, type: 'article' },
  }
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [event, all] = await Promise.all([getEvent(slug), getEvents()])
  if (!event) notFound()

  const i = all.findIndex((e) => e.slug === event.slug)
  const prev = i > 0 ? all[i - 1] : null
  const next = i >= 0 && i < all.length - 1 ? all[i + 1] : null

  // Structured data, so the date and place can be read by search engines and
  // calendar apps rather than only by people.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.start_time ? `${event.event_date}T${event.start_time}:00+09:00` : event.event_date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: event.place ?? 'Oita, Japan',
                address: { '@type': 'PostalAddress', addressRegion: 'Oita', addressCountry: 'JP' } },
    description: event.body ?? event.summary ?? undefined,
    organizer: { '@type': 'Organization', name: 'Nepal–Oita Community' },
  }

  return (
    <>
      <script type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="page-head">
        <div className="container">
          <Link className="link-arrow page-head__back" href="/events">
            <Icon name="arrow-right" flip /> All events
          </Link>
          <p className="eyebrow u-mb-1">
            {event.past ? 'Past' : 'Upcoming'}{event.category ? ` · ${event.category}` : ''}
          </p>
          <h1 className="display-1 u-measure-title">{event.title}</h1>
          {event.summary && <p className="lede u-measure u-mt-1">{event.summary}</p>}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid--2">
            <div>
              <div className="panel panel--ink reveal">
                <h2 className="panel__title"><Icon name="calendar" /> When and where</h2>
                <ul className="benefits">
                  <li>
                    <span className="plate plate--crimson"><Icon name="calendar" /></span>
                    <div><h4>Date</h4><p>{longDate(event.event_date)}</p></div>
                  </li>
                  {event.start_time && (
                    <li>
                      <span className="plate plate--moss"><Icon name="clock" /></span>
                      <div>
                        <h4>Time</h4>
                        <p>{event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}</p>
                      </div>
                    </li>
                  )}
                  {event.place && (
                    <li>
                      <span className="plate plate--indigo"><Icon name="pin" /></span>
                      <div><h4>Place</h4><p>{event.place}</p></div>
                    </li>
                  )}
                  {event.cost && (
                    <li>
                      <span className="plate plate--gold"><Icon name="star" /></span>
                      <div><h4>Cost</h4><p>{event.cost}</p></div>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div>
              <h2 className="display-3">What happens</h2>
              {event.body && <p className="lede u-mt-1">{event.body}</p>}
              {event.highlights.length > 0 && (
                <ul className="checklist u-mt-1">
                  {event.highlights.map((h) => (
                    <li key={h}><Icon name="check" /><span>{h}</span></li>
                  ))}
                </ul>
              )}

              <div className="panel mt-md reveal">
                {event.register_email && (
                  <p className="text-sm muted">Register by email: {event.register_email}</p>
                )}
                <div className="cluster mt-md">
                  <Link className="btn btn--primary" href="/#contact">
                    <Icon name="mail" /> Tell us you are coming
                  </Link>
                  <Link className="btn btn--ghost" href="/#join">
                    <Icon name="user-plus" /> Become a member
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="event-nav">
            {prev
              ? <Link className="btn btn--ghost" href={`/events/${prev.slug}`}>
                  <Icon name="arrow-right" flip /> {prev.title}
                </Link>
              : <span />}
            {next && (
              <Link className="btn btn--ghost" href={`/events/${next.slug}`}>
                {next.title} <Icon name="arrow-right" />
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
