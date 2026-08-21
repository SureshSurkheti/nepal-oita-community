import type { Metadata } from 'next'
import { Icon } from '@/components/Sprite'
import { PageHead } from '@/components/PageHead'
import { MeetingForm } from '@/components/MeetingForm'
import { MeetingEditor } from '@/components/MeetingEditor'
import { getMeetings, longDate, byMonth } from '@/lib/content'
import { getCurrentMember } from '@/lib/members'

/* noindex, and not out of caution: since 0016 the minutes are readable by
   members only, so there is nothing here for a search engine to have except the
   sign-in prompt — and a page indexed under "what the community decided" that
   turns out to be a locked door is worse than no result at all. The description
   goes with it for the same reason. */
export const metadata: Metadata = {
  title: 'Meeting decisions',
  robots: { index: false },
}

export default async function DecisionsPage() {
  // The member first: getMeetings() needs to know whether to send a query at
  // all, because a visitor has no read grant on these tables. See lib/content.
  const member = await getCurrentMember()
  const meetings = await getMeetings(member !== null)

  /* Nothing waits any more — 0015 made a contributor's write-up live on arrival.
     A row that is not 'approved' is therefore one the committee has taken down,
     and the only people who can see those are the leadership team and the
     committee, by policy. Splitting them here is presentation, not access
     control: an entry that had been pulled would otherwise sit in the middle of
     the published list looking published. */
  const published = meetings.filter((m) => m.status === 'approved')
  const hidden = meetings.filter((m) => m.status !== 'approved')

  /* Whether to render the Edit/Delete pair under each entry. The database
     refuses the write either way — meetings_contribute_update and
     _delete both call can_contribute() — so this only decides whether to offer
     controls that would fail. */
  const canEdit = member?.can_contribute === true || member?.is_admin === true

  return (
    <>
      <PageHead icon="check" eyebrow="Minutes" title="What we decided"
                back={{ href: '/', label: 'Back to home' }}
                lede={member
                  ? 'The committee and the members meet most months. These are the '
                    + 'decisions that came out of those meetings, written up by the '
                    + 'leadership team — so nobody has to remember what was agreed, '
                    + 'or take somebody’s word for it.'
                  : 'What the community has agreed, meeting by meeting. Members '
                    + 'only — sign in to read them.'} />

      <section className="section">
        <div className="container">
          {/* The gate. Not a curtain over markup that is present anyway: since
              0016 `anon` holds no SELECT grant on either meetings table, so a
              visitor's session cannot fetch a word of this even by asking
              PostgREST directly. There is nothing behind this panel to hide. */}
          {!member ? (
            <div className="panel u-measure-center">
              <h2 className="panel__title">
                <Icon name="shield" /> Members only
              </h2>
              <p className="u-mb-15">
                The minutes are the community talking to itself — fees, dates and
                who is doing what. They are for people on the register, general
                members and the leadership team alike, so they are not on the
                open web.
              </p>
              <div className="cluster">
                <a className="btn btn--primary" href="/sign-in">
                  <Icon name="shield" /> Sign in
                </a>
                <a className="btn btn--ghost" href="/#members">
                  <Icon name="users" /> How to join the register
                </a>
              </div>
            </div>
          ) : published.length === 0 ? (
            <p className="muted">
              Nothing written up yet. The leadership team can add a meeting below
              and it appears here straight away. (If nothing appears after adding
              one, the decisions tables arrive with <code>0012_meetings.sql</code>
              and the direct-publishing rules with <code>0015_meeting_authoring.sql</code>.)
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
                      {/* Under the entry it corrects, not on a separate admin
                          page: the officer fixing a decision is reading the
                          decision, and making them find the same entry again in
                          another list is how a typo survives for a month. */}
                      {canEdit && (
                        <MeetingEditor draft={{
                          id: m.id, held_on: m.held_on, title: m.title,
                          place: m.place, summary: m.summary,
                          points: m.points.map((p) => ({ text: p.text })),
                        }} />
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))
          )}

          {/* Not "waiting" any longer. These are write-ups a committee member
              has pulled down, and they are shown to the team that writes them
              rather than disappearing without a word. Editing one is allowed and
              putting it back is not: `status` is granted to nobody, which is the
              committee's one remaining lever over this section. */}
          {hidden.length > 0 && (
            <div className="panel u-mt-2 reveal">
              <h2 className="panel__title">
                <Icon name="shield" /> Taken down by the committee
              </h2>
              <p className="u-mb-15 text-sm muted">
                Off the site, and only the leadership team and the committee can
                see them here. You can correct one; only a committee member can
                put it back up.
              </p>
              <ol className="minutes">
                {hidden.map((m) => (
                  <li key={m.id} className="minute minute--hidden">
                    <p className="minute__flag"><Icon name="shield" /> {m.status}</p>
                    <p className="minute__date">
                      <Icon name="calendar" /> {longDate(m.held_on)}
                      {m.place && <> · {m.place}</>}
                    </p>
                    <h3 className="minute__title">{m.title}</h3>
                    {m.points.length > 0 && (
                      <ul className="checklist minute__points">
                        {m.points.map((p) => (
                          <li key={p.id}><Icon name="check" /><span>{p.text}</span></li>
                        ))}
                      </ul>
                    )}
                    {canEdit && (
                      <MeetingEditor draft={{
                        id: m.id, held_on: m.held_on, title: m.title,
                        place: m.place, summary: m.summary,
                        points: m.points.map((p) => ({ text: p.text })),
                      }} />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Only for somebody signed in. A visitor already has the gate above,
              and MeetingForm's own "sign in" state would be a second copy of the
              same message on the same screen. */}
          {member && (
            <div className="mt-lg u-measure-center">
              <MeetingForm memberId={member.id} canContribute={canEdit} />
            </div>
          )}
        </div>
      </section>
    </>
  )
}
