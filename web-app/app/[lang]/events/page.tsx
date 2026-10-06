import type { Metadata } from 'next'
import { localeAlternates, toLocale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'
import { EventCard } from '@/components/EventCard'
import { EventsRail } from '@/components/EventsRail'
import { EventsShowcaseButton } from '@/components/EventsShowcase'
import type { ShowcaseEvent } from '@/components/EventsShowcase'
import { chipDate, coverFor, getEvents, longDate, type EventRow } from '@/lib/content'

import { ContributeGate } from '@/components/ContributeGate'
import { Icon } from '@/components/Sprite'
import { PageHead } from '@/components/PageHead'

/* PRERENDERED. It used to be force-dynamic because of one members-only panel
   at the foot of the page; that panel is now components/ContributeGate, which
   resolves the session in the browser. See the long note in that file — this
   page was `x-vercel-cache: MISS` for every visitor to decide whether to draw a
   form almost none of them may use. */
export const revalidate = 300

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

  const events = await getEvents(lang)


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
          <ContributeGate kind="event" />

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
