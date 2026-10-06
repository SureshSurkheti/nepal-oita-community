'use client'

import { useEffect, useState } from 'react'
import { LocaleLink as Link } from './LocaleLink'
import { Icon } from './Sprite'
import { DecisionsPager } from './DecisionsPager'
import { MeetingEditor } from './MeetingEditor'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/useI18n'
import { longDate } from '@/lib/dates'
import type { Meeting, MeetingPoint } from '@/lib/types'

/* The committee's write-ups, on the home page, FETCHED IN THE BROWSER.
 *
 * WHY IT MOVED OFF THE SERVER — this is the whole reason the home page is fast.
 * The section is for members only, so rendering it on the server meant asking
 * who the visitor was, which meant reading cookies, which made the ENTIRE route
 * dynamic. Measured on the live site: `x-vercel-cache: MISS` on every single
 * request and 2.6s to first byte on a cold start, while /programmes — the one
 * page that reads nothing — answered HIT in 0.45s. One members-only section at
 * the bottom of the page was costing every visitor the whole page's cache.
 *
 * NOTHING HERE DECIDES WHO MAY SEE IT. `anon` has no grant on `meetings` or
 * `meeting_points` at all — checked against the live project, which answers
 * `42501 permission denied` — so a visitor's query returns an error and this
 * renders nothing. A member's returns rows. The gate is the database, exactly
 * as it was before; what changed is only where the question is asked from.
 *
 * It renders NOTHING until the answer is known, rather than a heading with a
 * spinner under it. A visitor must never see a "What was decided" heading
 * appear and then vanish, and a member waiting half a second for a section far
 * below the fold has not lost anything. */
export function HomeMinutes() {
  const { t, locale } = useI18n()
  const [meetings, setMeetings] = useState<Meeting[] | null>(null)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let live = true

    async function read() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!live) return
      if (!user) { setMeetings([]); return }

      const [meetingRes, pointRes, memberRes] = await Promise.all([
        supabase.from('meetings').select('*').order('held_on', { ascending: false }),
        supabase.from('meeting_points').select('*').order('position'),
        supabase.from('members').select('can_contribute, is_admin').eq('user_id', user.id).maybeSingle(),
      ])
      if (!live) return

      if (meetingRes.error || !meetingRes.data) { setMeetings([]); return }

      /* The same fallback getMeetings() applies on the server: the Nepali when
         there is one, the English otherwise, so a decision minuted this morning
         is readable on the Nepali page rather than being an empty bullet. */
      const ne = locale === 'ne'
      const byMeeting = new Map<string, MeetingPoint[]>()
      type RawPoint = MeetingPoint & { meeting_id: string; text_ne: string | null }
      for (const p of (pointRes.data ?? []) as RawPoint[]) {
        const list = byMeeting.get(p.meeting_id) ?? []
        list.push({ id: p.id, position: p.position, text: (ne && p.text_ne) || p.text })
        byMeeting.set(p.meeting_id, list)
      }

      type RawMeeting = Omit<Meeting, 'points'> & { title_ne: string | null; summary_ne: string | null }
      const rows = (meetingRes.data as RawMeeting[]).map((m) => ({
        ...m,
        title: (ne && m.title_ne) || m.title,
        summary: (ne && m.summary_ne) || m.summary,
        points: byMeeting.get(m.id) ?? [],
      }))

      setMeetings(rows)
      const me = memberRes.data as { can_contribute?: boolean; is_admin?: boolean } | null
      setCanEdit(me?.can_contribute === true || me?.is_admin === true)
    }

    read()
    /* Signing in or out in another tab should fill this in or empty it, rather
       than leaving a members-only section on a signed-out page until reload. */
    const { data: sub } = supabase.auth.onAuthStateChange(() => { read() })
    return () => { live = false; sub.subscription.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  if (meetings === null) return null

  /* Live write-ups only. A taken-down one comes back for the leadership team as
     well, and the front page is not where they should find it. Reversed, because
     the pager opens on the last one and steps backwards in time — which puts the
     newest first without the arrows working the wrong way round. */
  const decisions = meetings.filter((m) => m.status === 'approved').reverse()
  if (decisions.length === 0) return null
  const latest = decisions.length - 1

  return (
    <section className="section" id="decisions">
      <div className="container">
        <div className="section-head section-head--center reveal is-in">
          <p className="eyebrow eyebrow--center">
            <span className="eyebrow__badge"><Icon name="check" /></span>
            {t.home.decisions.eyebrow}
          </p>
          <h2 className="display-2">{t.home.decisions.title}</h2>
          <p className="lede">{t.home.decisions.lede}</p>
        </div>

        {/* `is-in` is set here rather than left to the IntersectionObserver.
            SiteMotion makes its pass once, shortly after load; this section does
            not exist yet at that moment, so a `.reveal` without it would arrive
            at opacity 0 and stay there for ever. */}
        <div className="decisions-panel reveal is-in">
          <DecisionsPager label={t.home.decisions.pager}>
            {decisions.map((m, i) => (
              <article key={m.id}
                       className={`decision${i === latest ? ' decision--latest' : ''}`}>
                {i === latest && (
                  <p className="decision__flag"><Icon name="star" /> {t.home.decisions.latest}</p>
                )}
                <p className="decision__date">
                  <Icon name="calendar" /> {longDate(m.held_on)}
                  {m.place && <span className="decision__place">{m.place}</span>}
                </p>
                <h3 className="decision__title">{m.title}</h3>
                {m.summary && <p className="decision__summary">{m.summary}</p>}
                {m.points.length > 0 && (
                  <div className="decision__points">
                    <ul className="checklist">
                      {m.points.map((p) => (
                        <li key={p.id}><Icon name="check" /><span>{p.text}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Edit only. Delete is deliberately not offered here: the front
                    page is where people come to read what was decided, and a
                    control with no undo does not belong one mis-tap away from
                    it. It is on /decisions. */}
                {canEdit && (
                  <MeetingEditor allowDelete={false} draft={{
                    id: m.id, held_on: m.held_on, title: m.title,
                    place: m.place, summary: m.summary,
                    points: m.points.map((p) => ({ text: p.text })),
                  }} />
                )}
              </article>
            ))}
          </DecisionsPager>

          <div className="cluster cluster--center mt-lg">
            <Link className="btn btn--ghost" href="/decisions">
              <Icon name="check" /> {t.home.decisions.everyMeeting}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
