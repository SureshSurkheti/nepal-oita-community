import type { Metadata } from 'next'
import { Icon } from '@/components/Sprite'
import { PageHead } from '@/components/PageHead'
import { MeetingForm } from '@/components/MeetingForm'
import { getMeetings, longDate, byMonth } from '@/lib/content'
import { getCurrentMember } from '@/lib/members'

export const metadata: Metadata = {
  title: 'Meeting decisions',
  description:
    'What the Nepal–Oita Community has decided, meeting by meeting — fees, dates, '
    + 'events and the work in between, written up as it was agreed.',
}

export default async function DecisionsPage() {
  const [meetings, member] = await Promise.all([getMeetings(), getCurrentMember()])

  /* The read policies return approved write-ups to everyone and, additionally,
     the caller's own pending ones. Splitting them here is presentation, not
     access control — a member should not have to hunt through the published
     list for the one they are waiting on. */
  const published = meetings.filter((m) => m.status === 'approved')
  const mine = meetings.filter((m) => m.status !== 'approved')

  return (
    <>
      <PageHead eyebrow="Minutes" title="What we decided"
                back={{ href: '/', label: 'Back to home' }}
                lede={'The committee and the members meet most months. These are the '
                      + 'decisions that came out of those meetings, in the order they '
                      + 'were taken — so nobody has to remember what was agreed, or '
                      + 'take somebody’s word for it.'} />

      <section className="section">
        <div className="container">
          {published.length === 0 ? (
            <p className="muted">
              Nothing written up yet. Members can add a meeting below and the
              committee confirms it. (If nothing appears after adding one, the
              decisions tables arrive with <code>0012_meetings.sql</code>.)
            </p>
          ) : (
            /* Grouped by month, because the committee meets monthly and the
               question people arrive with is "what did we decide in August".
               Each entry still carries its own full date — weekday, day, month
               and year — since a decision is often referred to by exactly that. */
            byMonth(published).map((group) => (
              <section className="month" key={group.key}>
                <h2 className="month__heading">
                  {group.label}
                  <span className="count-note">
                    {group.meetings.length} meeting{group.meetings.length === 1 ? '' : 's'}
                  </span>
                </h2>
                <ol className="minutes">
                  {group.meetings.map((m) => (
                    <li key={m.id} className="minute reveal" id={`m-${m.held_on}`}>
                      <p className="minute__date">
                        <Icon name="calendar" /> {longDate(m.held_on)}
                        {m.place && <> · {m.place}</>}
                      </p>
                      <h3 className="minute__title">{m.title}</h3>
                      {m.summary && <p className="minute__summary">{m.summary}</p>}
                      {m.points.length > 0 && (
                        <ul className="checklist minute__points">
                          {m.points.map((p) => (
                            <li key={p.id}><Icon name="check" /><span>{p.text}</span></li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))
          )}

          {mine.length > 0 && (
            <div className="panel u-mt-2 reveal">
              <h2 className="panel__title"><Icon name="clock" /> Yours, waiting</h2>
              <ul className="roster">
                {mine.map((m) => (
                  <li key={m.id}>
                    <span className="avatar" aria-hidden="true"><Icon name="clock" /></span>
                    <span>
                      <span className="roster__name">
                        {m.title} <span className="text-sm muted">· {m.status}</span>
                      </span><br />
                      <span className="roster__meta">
                        {longDate(m.held_on)} · {m.points.length} decision
                        {m.points.length === 1 ? '' : 's'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-lg u-measure-center">
            <MeetingForm memberId={member?.id ?? null}
                         canContribute={member?.can_contribute === true || member?.is_admin === true} />
          </div>
        </div>
      </section>
    </>
  )
}
