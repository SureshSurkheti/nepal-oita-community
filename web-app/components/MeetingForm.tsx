'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'

/** The fields of a write-up being edited, as the form needs them. */
export type MeetingDraft = {
  id: string
  held_on: string
  title: string
  place: string | null
  summary: string | null
  points: { text: string }[]
}

/* Writing up a meeting, and correcting one: the date, a title, and the decisions
 * as separate lines.
 *
 * Points are one-per-line rather than a rich text box on purpose. The section
 * they end up in is a list of decisions, and a decision is a sentence — a free
 * text area invites a paragraph, and a paragraph is where "we agreed X" goes to
 * hide. Splitting on newlines is also the only format somebody can paste their
 * own notes straight into.
 *
 * It goes live on save. There is no approval step any more: 0015 flipped the
 * default status to 'approved' and gave the leadership team update and delete,
 * on the grounds that the review was guarding against strangers filing minutes
 * and 0013 had already removed the strangers. The committee keeps `status`, so
 * it can still take a write-up down; nothing here can put one back up.
 *
 * ONE COMPONENT, TWO JOBS
 * Editing is the same six fields as writing, so it is the same form with `draft`
 * set. The alternative was a second component that would drift out of step with
 * this one the first time a field was added — and the field list is exactly what
 * the database grant is scoped to, so drift there is a bug that surfaces as a
 * refused UPDATE rather than as a missing input.
 */
export function MeetingForm({ memberId, canContribute, draft, onDone }: {
  memberId: string | null
  /** From members.can_contribute — the database refuses the write regardless,
      so this only decides whether to show a form that would fail. */
  canContribute: boolean
  /** Present when correcting an existing write-up rather than adding one. */
  draft?: MeetingDraft
  /** Called after a successful save, and on cancel, when editing. */
  onDone?: () => void
}) {
  const router = useRouter()
  const editing = draft !== undefined
  const today = new Date().toISOString().slice(0, 10)

  const [heldOn, setHeldOn] = useState(draft?.held_on ?? today)
  const [title, setTitle] = useState(draft?.title ?? '')
  const [place, setPlace] = useState(draft?.place ?? '')
  const [summary, setSummary] = useState(draft?.summary ?? '')
  const [points, setPoints] = useState(
    draft ? draft.points.map((p) => p.text).join('\n') : '',
  )
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* The two "you cannot use this" states only apply to the add form. An editor is
     never rendered for somebody who is not a contributor in the first place. */
  if (!editing && !memberId) {
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

  /* Minutes are a record of what the community committed to, so who may write one
     down is a smaller group than who may tell their own story. Enforced in the
     database by meetings_submit; this only avoids offering a form that would be
     refused. */
  if (!editing && !canContribute) {
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
    const fields = {
      held_on: heldOn,
      title: title.trim(),
      place: place.trim() || null,
      summary: summary.trim() || null,
    }

    let meetingId = draft?.id

    if (editing) {
      const { error: e } = await supabase.from('meetings')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', draft!.id)
      if (e) { setBusy(false); setError(`Could not save that. ${e.message}`); return }

      /* Delete-then-insert, not a diff. The decisions arrive as a textarea of
         lines, so there is no stable identity to match a line back to a row once
         somebody has reordered or reworded them — a diff would be guesswork that
         quietly attaches the wrong decision to the wrong position. */
      const { error: clear } = await supabase.from('meeting_points')
        .delete().eq('meeting_id', draft!.id)
      if (clear) { setBusy(false); setError(`Could not replace the decisions. ${clear.message}`); return }
    } else {
      const { data, error: e } = await supabase.from('meetings')
        .insert({ ...fields, submitted_by: memberId })
        .select('id')
        .single()
      if (e || !data) {
        setBusy(false)
        setError(`Could not save that. ${e?.message ?? 'No row came back.'}`)
        return
      }
      meetingId = data.id
    }

    const { error: pointError } = await supabase.from('meeting_points').insert(
      lines.map((text, i) => ({ meeting_id: meetingId, text, position: i })),
    )
    setBusy(false)

    if (pointError) {
      /* The meeting row is saved and the decisions are not, which is the one
         outcome worth being precise about. When editing it is worse than when
         adding: the old decisions have already been deleted, so the write-up is
         live with nothing under it. Say so, and say what is still in the box. */
      setError(
        `The meeting was saved but its decisions were not: ${pointError.message}. `
        + (editing
          ? 'The old ones have already been cleared, so it is live with none — '
            + 'the text is still in the box below, so try Save again.'
          : 'Tell the committee, and they can delete the empty one.'),
      )
      return
    }

    router.refresh()
    if (onDone) onDone()
    else setSent(true)
  }

  if (sent) {
    return (
      <div className="panel">
        <h2 className="panel__title"><Icon name="check" /> It is up</h2>
        <p>
          The write-up is on this page and on the front page now. If something is
          wrong with it, use Edit on the entry itself.
        </p>
        <button className="btn btn--ghost u-mt-1" type="button"
                onClick={() => { setSent(false); setTitle(''); setSummary(''); setPoints('') }}>
          <Icon name="send" /> Add another
        </button>
      </div>
    )
  }

  const fields = (
    <>
      <div className="field-grid">
        <div className="field">
          <label htmlFor={`m-date-${draft?.id ?? 'new'}`}>Date of the meeting</label>
          <input id={`m-date-${draft?.id ?? 'new'}`} type="date" required max={today}
                 value={heldOn} onChange={(e) => setHeldOn(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`m-place-${draft?.id ?? 'new'}`}>
            Where <span className="muted">(optional)</span>
          </label>
          <input id={`m-place-${draft?.id ?? 'new'}`} type="text" maxLength={80}
                 placeholder="Oita Community Centre"
                 value={place} onChange={(e) => setPlace(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`m-title-${draft?.id ?? 'new'}`}>Title</label>
        <input id={`m-title-${draft?.id ?? 'new'}`} type="text" required maxLength={120}
               placeholder="August monthly meeting"
               value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`m-summary-${draft?.id ?? 'new'}`}>
          A line about it <span className="muted">(optional)</span>
        </label>
        <input id={`m-summary-${draft?.id ?? 'new'}`} type="text" maxLength={200}
               placeholder="Twenty-two people, two hours, mostly Dashain."
               value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`m-points-${draft?.id ?? 'new'}`}>
          What was decided — one per line
        </label>
        <textarea id={`m-points-${draft?.id ?? 'new'}`} required rows={6}
                  placeholder={'Annual fee stays at ¥3,000\nDashain booked for 18 October\nTwo more volunteers needed for the kitchen'}
                  value={points} onChange={(e) => setPoints(e.target.value)} />
      </div>
      {error && <p className="form-note form-note--error">{error}</p>}
    </>
  )

  if (editing) {
    return (
      <form className="minute-edit" onSubmit={submit}>
        {fields}
        <div className="cluster">
          <button className="btn btn--primary btn--sm" type="submit" disabled={busy}>
            <Icon name="check" />{busy ? 'Saving…' : 'Save changes'}
          </button>
          <button className="btn btn--ghost btn--sm" type="button" disabled={busy}
                  onClick={() => onDone && onDone()}>
            Cancel
          </button>
        </div>
        <p className="form-note">
          Saved changes are live straight away — this is what everybody reads.
        </p>
      </form>
    )
  }

  return (
    <div className="panel">
      <h2 className="panel__title"><Icon name="send" /> Add a meeting</h2>
      <form onSubmit={submit}>
        {fields}
        <button className="btn btn--primary" type="submit" disabled={busy}>
          <Icon name="send" />{busy ? 'Publishing…' : 'Publish the write-up'}
        </button>
        <p className="form-note">
          It goes up straight away, on this page and on the front page. You can
          correct it afterwards with Edit — nothing waits for approval.
        </p>
      </form>
    </div>
  )
}
