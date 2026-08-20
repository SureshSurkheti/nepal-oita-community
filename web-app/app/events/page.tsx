import type { Metadata } from 'next'
import { EventCard } from '@/components/EventCard'
import { EventsRail } from '@/components/EventsRail'
import { getEvents, getMyDraftEvents, longDate } from '@/lib/content'
import { getCurrentMember } from '@/lib/members'
import { EventProposeForm } from '@/components/EventProposeForm'
import { Icon } from '@/components/Sprite'
import { PageHead } from '@/components/PageHead'

export const metadata: Metadata = {
  title: 'Events',
  description:
    'Festivals, meetups, sport and volunteering with the Nepali community of Oita '
    + 'and Beppu — what is coming up, and everything we have run.',
}

export default async function EventsPage() {
  const [events, member] = await Promise.all([getEvents(), getCurrentMember()])
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
      <PageHead eyebrow="Events" title="Come to the next one"
                back={{ href: '/#events', label: 'Back to home' }}
                lede={'You do not need to know anyone. Turn up, and you will by the '
                      + 'end of the day.'} />

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
              <EventsRail pastCount={past.length}
                          upcomingIndex={upcoming.length > 0 ? past.length : -1}>
                {ordered.map((e) => <EventCard key={e.id} event={e} />)}
              </EventsRail>
            </>
          )}
        </div>
      </section>
    </>
  )
}
