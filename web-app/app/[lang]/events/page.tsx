import type { Metadata } from 'next'
import { localeAlternates, toLocale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'
import { EventCard } from '@/components/EventCard'
import { EventsRail } from '@/components/EventsRail'
import { EventsShowcaseButton } from '@/components/EventsShowcase'
import type { ShowcaseEvent } from '@/components/EventsShowcase'
import { chipDate, coverFor, getEvents, getMyDraftEvents, longDate, type EventRow } from '@/lib/content'

import { getCurrentMember } from '@/lib/members'
import { EventProposeForm } from '@/components/EventProposeForm'
import { Icon } from '@/components/Sprite'
import { PageHead } from '@/components/PageHead'

/* Depends on who is asking, so it can never be cached or prerendered.
   This used to be inherited from the root layout's force-dynamic; the layout
   dropped it so the public pages could be served from a CDN, which means the
   viewer-specific routes have to declare it themselves. Reading cookies would
   make it dynamic anyway — saying so explicitly stops a build trying to
   prerender it, and stops a future edit quietly making it cacheable. */
export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const lang = toLocale((await params).lang)
  return {
    alternates: localeAlternates(lang, '/events'),
    title: getDictionary(lang).meta.eventsTitle,
    description: getDictionary(lang).meta.eventsDesc,
  }
}

/* The same shape the header builds in the layout. Kept beside the only other
   caller rather than in lib/content, because it exists for one component. */
function showcaseEvent(e: EventRow): ShowcaseEvent {
  const { month, day } = chipDate(e.event_date)
  return {
    slug: e.slug, title: e.title, summary: e.summary,
    dateLabel: longDate(e.event_date), month, day,
    start_time: e.start_time, end_time: e.end_time,
    place: e.place, category: e.category, accent: e.accent,
    cover: coverFor(e.slug, e.cover_path),
    highlights: e.highlights, past: e.past,
  }
}

export default async function EventsPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = toLocale((await params).lang)
  const t = getDictionary(lang)

  const [events, member] = await Promise.all([getEvents(lang), getCurrentMember()])
  const canAdd = member !== null && (member.can_contribute || member.is_admin)

  // Their own drafts, so a submission does not appear to vanish while it waits.
  const drafts = canAdd ? await getMyDraftEvents() : []

  /* Oldest first, so the rail reads left to right as one timeline. The rail
     component then parks itself on the first event still to come. */
  const past = events.filter((e) => e.past)
  const upcoming = events.filter((e) => !e.past)
  const ordered = [...past, ...upcoming]

  return (
    <>
      <PageHead lang={lang} path="/events" icon="calendar" eyebrow={t.pages.events.eyebrow} title={t.pages.events.title}
                back={{ href: '/#events', label: t.pages.events.back }}
                lede={t.pages.events.lede} />

      <section className="section">
        <div className="container">
          {canAdd && (
            <div className="u-measure-center u-mb-2">
              {drafts.length > 0 && (
                <div className="panel u-mb-15">
                  <h2 className="panel__title">
                    <Icon name="clock" /> Waiting to be published
                  </h2>
                  <ul className="roster">
                    {drafts.map((d) => (
                      <li key={d.id}>
                        <span className="avatar" aria-hidden="true"><Icon name="clock" /></span>
                        <span>
                          <span className="roster__name">{d.title}</span><br />
                          <span className="roster__meta">
                            {longDate(d.event_date)}{d.place ? ` · ${d.place}` : ''}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <EventProposeForm memberId={member.id} />
            </div>
          )}

          {ordered.length === 0 ? (
            <p className="muted">
              Nothing on the calendar just now — new dates go up here as soon as they are set.
            </p>
          ) : (
            <>
              {upcoming.length === 0 && (
                <p className="muted u-mb-15">
                  Nothing on the calendar just now — new dates go up as soon as they are set.
                </p>
              )}
              {/* The same full-screen view the header's badge opens, but over
                  the whole timeline — free here, because the page has already
                  loaded every event it needs. */}
              <div className="cluster cluster--center u-mb-15">
                <EventsShowcaseButton events={ordered.map(showcaseEvent)} />
              </div>
              <EventsRail pastCount={past.length}
                          upcomingIndex={upcoming.length > 0 ? past.length : -1}>
                {ordered.map((e, i) => <EventCard key={e.id} event={e} index={i} lang={lang} />)}
              </EventsRail>
            </>
          )}
        </div>
      </section>
    </>
  )
}
