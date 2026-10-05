import { LocaleLink as Link } from '@/components/LocaleLink'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Icon } from '@/components/Sprite'
import { coverFor, getEvent, getEvents, longDate } from '@/lib/content'
import { fallbackCoverFor } from '@/lib/covers'
import { localeAlternates, toLocale, LOCALE_TAGS } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'
import { SITE_NAME, abs } from '@/lib/site'
import { CoverImage } from '@/components/CoverImage'

/* FULLY PUBLIC — no session is read anywhere on this page, so it is prerendered
   and served from the CDN edge. Every visitor gets identical bytes with zero
   database work and no serverless function.

   `revalidate` is only the backstop: publishing or editing an event calls
   updateTag, which refreshes it at once. See lib/content.ts. */
export const revalidate = 300

/* Prerender every event at build time rather than on first visit. Without this
   the route is rendered on demand — the first person to open an event waits for
   a cold render, and with ten events that is ten people. The list comes from the
   cached published-events read, so this costs one query for the whole set. */
export async function generateStaticParams() {
  const events = await getEvents()
  return events.map((e) => ({ slug: e.slug }))
}

/* One route replaces the ten hand-written event-*.html files. Adding an event is
   now a database row, not a new file that somebody has to remember to create —
   which is how the static site ended up with a Details link that would 404 if
   you forgot. */

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string; slug: string }> },
): Promise<Metadata> {
  const { lang, slug } = await params
  const event = await getEvent(slug, toLocale(lang))
  if (!event) return { title: 'Event not found' }
  /* The summary first, then the write-up. A meta description is a 155-character
     pitch in a search result, and `body` opens with a full paragraph that gets
     cut mid-sentence; `summary` is already written to that length. */
  const description = event.summary ?? event.body ?? undefined
  /* THE EVENT'S OWN PHOTOGRAPH, not the site-wide card. Every event shared one
     opengraph-image.jpg, so ten different events posted to Facebook or sent in a
     LINE message all previewed as the same picture — which is the one case where
     a link preview actively misleads. coverFor never returns null, so there is
     always one. */
  const image = coverFor(slug, event.cover_path)
  return {
    title: event.title,
    description,
    alternates: localeAlternates(toLocale(lang), `/events/${slug}`),
    openGraph: { title: event.title, description, type: 'article',
                 url: `/${lang}/events/${slug}`, images: [image] },
    twitter: { card: 'summary_large_image', title: event.title, description, images: [image] },
  }
}

export default async function EventPage(
  { params }: { params: Promise<{ lang: string; slug: string }> },
) {
  const { lang, slug } = await params
  const locale = toLocale(lang)
  const [event, all] = await Promise.all([getEvent(slug, locale), getEvents(locale)])
  if (!event) notFound()

  const t = getDictionary(locale)

  const i = all.findIndex((e) => e.slug === event.slug)
  const prev = i > 0 ? all[i - 1] : null
  const next = i >= 0 && i < all.length - 1 ? all[i + 1] : null

  /* Structured data, so the date and the place can be read by a search engine
     and a calendar app rather than only by a person.
     
     `image` IS WHAT MAKES THIS ELIGIBLE FOR AN EVENT RICH RESULT. Google's
     documented requirements for the Event type are name, startDate, location and
     image; this had the first three, so it validated as an Event and was never
     shown as one. coverFor never returns null, so there is always an image to
     give — see lib/covers.
     
     `url` and `inLanguage` carry the locale. Without the first, the two language
     versions describe the same event with no way to tell which page each belongs
     to; without the second, the Nepali page offers Google an English-looking
     node. Both are the same mistake the breadcrumbs used to make.
     
     endDate only when there is one. An endDate equal to startDate is worse than
     none: it tells a calendar the event lasts zero minutes. */
  const tz = '+09:00'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    url: abs(`/${lang}/events/${slug}`),
    inLanguage: LOCALE_TAGS[locale],
    startDate: event.start_time ? `${event.event_date}T${event.start_time}:00${tz}` : event.event_date,
    ...(event.end_time ? { endDate: `${event.event_date}T${event.end_time}:00${tz}` } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: event.place ?? 'Oita, Japan',
                address: { '@type': 'PostalAddress', addressRegion: 'Oita', addressCountry: 'JP' } },
    image: [abs(coverFor(slug, event.cover_path))],
    description: event.summary ?? event.body ?? undefined,
    organizer: { '@type': 'Organization', name: SITE_NAME, url: abs(`/${lang}`) },
  }

  /* Three levels here, where the other pages have two: an event genuinely sits
     under /events, and that is a hierarchy the links on the page back up. Every
     URL carries the locale, for the reason written out in PageHead. */
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: abs(`/${lang}`) },
      { '@type': 'ListItem', position: 2, name: t.nav.events, item: abs(`/${lang}/events`) },
      { '@type': 'ListItem', position: 3, name: event.title, item: abs(`/${lang}/events/${slug}`) },
    ],
  }

  return (
    <>
      <script type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

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
          {/* The photograph, above everything else on the page. There is always
              one now: an event with no cover of its own borrows the same site
              photograph its card borrowed, so the card someone pressed and the
              page they land on show the same picture. See lib/covers. */}
          <div className="event-hero reveal">
            <CoverImage src={coverFor(event.slug, event.cover_path)}
                        alt={event.title} priority
                        fallback={fallbackCoverFor(event.slug)} />
          </div>

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
