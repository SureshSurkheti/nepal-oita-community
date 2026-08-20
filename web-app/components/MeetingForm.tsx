'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'

/* Writing up a meeting: the date, a title, and the decisions as separate lines.
 *
 * Points are one-per-line rather than a rich text box on purpose. The section
 * they end up in is a list of decisions, and a decision is a sentence — a free
 * text area invites a paragraph, and a paragraph is where "we agreed X" goes to
 * hide. Splitting on newlines is also the only format somebody can paste their
 * own notes straight into.
 *
 * It lands as pending. The database enforces that, not this form: `status` is
 * not in the INSERT grant, so it takes its default whatever gets sent. */
export function MeetingForm({ memberId, canContribute }: {
  memberId: string | null
  /** From members.can_contribute — the database refuses the insert regardless,
      so this only decides whether to show a form that would fail. */
  canContribute: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [heldOn, setHeldOn] = useState(today)
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [summary, setSummary] = useState('')
  const [points, setPoints] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!memberId) {
    return (
      <div className="panel">
        <h2 className="panel__title"><Icon name="send" /> Add a meeting</h2>
        <p className="u-mb-15">
          The leadership team writes these up. Sign in and, if you are on it, the
          form appears here.
        </p>
        <a className="btn btn--primary" href="/sign-in">
          <Icon name="shield" /> Sign in
        </a>
      </div>
    )
  }

  /* Minutes are a record of what the community committed to, so who may write
     one down is a smaller group than who may tell their own story. Enforced in
     the database by the meetings_submit policy; this only avoids offering a form
     that would be refused. */
  if (!canContribute) {
    return (
      <div className="panel">
        <h2 className="panel__title"><Icon name="shield" /> Added by the leadership team</h2>
        <p>
          Anyone can read these. Writing one up is for the leadership team, because
          a decision here is a record of what the community has agreed. If you were
          at the meeting and something is missing or wrong,{' '}
          <a href="mailto:nepaloitacommunity11@gmail.com">tell the committee</a> and
          they will correct it.
        </p>
      </div>
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const lines = points.split('\n').map((l) => l.replace(/^[-•*\s]+/, '').trim())
                        .filter(Boolean)
    if (!title.trim()) { setError('Give it a title — "August monthly meeting" is fine.'); return }
    if (lines.length === 0) { setError('At least one decision, one per line.'); return }

    setBusy(true)
    const supabase = createClient()

    const { data, error: meetingError } = await supabase.from('meetings')
      .insert({
        held_on: heldOn,
        title: title.trim(),
        place: place.trim() || null,
        summary: summary.trim() || null,
        submitted_by: memberId,
      })
      .select('id')
      .single()

    if (meetingError || !data) {
      setBusy(false)
      setError(`Could not save that. ${meetingError?.message ?? 'No row came back.'}`)
      return
    }

    const { error: pointError } = await supabase.from('meeting_points').insert(
      lines.map((text, i) => ({ meeting_id: data.id, text, position: i })),
    )
    setBusy(false)

    if (pointError) {
      /* The meeting row is in and the points are not, which is the one outcome
         worth being precise about: silently reporting success would leave a
         write-up with no decisions in it for the committee to puzzle over. */
      setError(
        `The meeting was saved but its decisions were not: ${pointError.message}. `
        + 'Tell the committee, and they can delete the empty one.',
      )
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="panel">
        <h2 className="panel__title"><Icon name="check" /> Sent to the committee</h2>
        <p>
          It is on your list below, marked as waiting. Once a committee member
          confirms it, it appears on this page for everybody.
        </p>
      </div>
    )
  }

  return (
    <div className="panel">
      <h2 className="panel__title"><Icon name="send" /> Add a meeting</h2>
      <form onSubmit={submit}>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="m-date">Date of the meeting</label>
            <input id="m-date" type="date" required max={today}
                   value={heldOn} onChange={(e) => setHeldOn(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="m-place">Where <span className="muted">(optional)</span></label>
            <input id="m-place" type="text" maxLength={80}
                   placeholder="Oita Community Centre"
                   value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="m-title">Title</label>
          <input id="m-title" type="text" required maxLength={120}
                 placeholder="August monthly meeting"
                 value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="m-summary">A line about it <span className="muted">(optional)</span></label>
          <input id="m-summary" type="text" maxLength={200}
                 placeholder="Twenty-two people, two hours, mostly Dashain."
                 value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="m-points">What was decided — one per line</label>
          <textarea id="m-points" required rows={6}
                    placeholder={'Annual fee stays at ¥3,000\nDashain booked for 18 October\nTwo more volunteers needed for the kitchen'}
                    value={points} onChange={(e) => setPoints(e.target.value)} />
        </div>
        <button className="btn btn--primary" type="submit" disabled={busy}>
          <Icon name="send" />{busy ? 'Sending…' : 'Send to the committee'}
        </button>
        {error && <p className="form-note form-note--error">{error}</p>}
        <p className="form-note">
          A committee member confirms it before it appears. Decisions are what the
          community has committed to, so somebody checks them first.
        </p>
      </form>
    </div>
  )
}
