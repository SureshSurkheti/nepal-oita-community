'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'

const ACCENTS = ['crimson', 'indigo', 'moss', 'gold'] as const

/* Adding an event, for the leadership team.
 *
 * It arrives unpublished and a committee member publishes it. That is not a
 * lack of trust — it is the consequence of "add but not modify": a leadership
 * member cannot edit an event once it exists, so if it went straight to the
 * homepage a wrong date would sit there until somebody else fixed it, and a
 * wrong date for Dashain has people turning up on the wrong Sunday.
 *
 * The two fields that are NOT here are the ones the database refuses anyway:
 * `is_published`, which the insert policy pins to false, and `submitted_by`,
 * which it pins to one of the caller's own member rows. Sending anything else
 * for either is rejected by Postgres, not by this component.
 */
export function EventProposeForm({ memberId }: { memberId: string }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [place, setPlace] = useState('')
  const [category, setCategory] = useState('Community')
  const [cost, setCost] = useState('')
  const [summary, setSummary] = useState('')
  const [highlights, setHighlights] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slugify = (s: string) => s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!title.trim()) { setError('Give it a name.'); return }
    if (!date) { setError('When is it?'); return }

    const lines = highlights.split('\n').map((l) => l.replace(/^[-•*\s]+/, '').trim())
                            .filter(Boolean)

    setBusy(true)
    const supabase = createClient()

    /* The slug is the event's own URL, so a clash is a real possibility once
       "Monthly Community Meetup" happens twelve times a year. The date is part
       of it for that reason — and it makes the address self-describing. */
    const slug = `${slugify(title)}-${date}`

    const { data, error: insertError } = await supabase.from('events').insert({
      slug,
      title: title.trim(),
      summary: summary.trim() || null,
      event_date: date,
      start_time: start || null,
      end_time: end || null,
      place: place.trim() || null,
      category: category.trim() || null,
      cost: cost.trim() || null,
      accent: ACCENTS[Math.abs(slug.length) % ACCENTS.length],
      is_published: false,
      submitted_by: memberId,
    }).select('id').single()

    if (insertError || !data) {
      setBusy(false)
      setError(insertError?.message.includes('duplicate')
        ? 'There is already an event with that name on that date.'
        : `Could not save that. ${insertError?.message ?? 'No row came back.'}`)
      return
    }

    if (lines.length > 0) {
      const { error: hlError } = await supabase.from('event_highlights').insert(
        lines.map((text, i) => ({ event_id: data.id, text, position: i })),
      )
      if (hlError) {
        setBusy(false)
        // Be specific: the event is in and its details are not, and saying
        // "saved" would leave the committee wondering why it is half empty.
        setError(`The event was saved but its details were not: ${hlError.message}. `
                 + 'Tell the committee.')
        return
      }
    }

    setBusy(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="panel">
        <h2 className="panel__title"><Icon name="check" /> Sent to the committee</h2>
        <p>
          It is saved but not on the site yet — a committee member publishes it.
          You cannot edit it from here, so if something is wrong, tell them before
          they do.
        </p>
      </div>
    )
  }

  return (
    <div className="panel">
      <h2 className="panel__title"><Icon name="calendar" /> Add an event</h2>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="e-title">What is it</label>
          <input id="e-title" type="text" required maxLength={120}
                 placeholder="Dashain Celebration"
                 value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="e-date">Date</label>
            <input id="e-date" type="date" required
                   value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="e-cat">Kind</label>
            <select id="e-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Community</option>
              <option>Festival</option>
              <option>Sports</option>
              <option>Cultural</option>
              <option>Volunteering</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="e-start">Starts <span className="muted">(optional)</span></label>
            <input id="e-start" type="time"
                   value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="e-end">Ends <span className="muted">(optional)</span></label>
            <input id="e-end" type="time"
                   value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="e-place">Where</label>
            <input id="e-place" type="text" maxLength={100} placeholder="Oita Cultural Hall"
                   value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="e-cost">Cost <span className="muted">(optional)</span></label>
            <input id="e-cost" type="text" maxLength={80}
                   placeholder="Free for members · ¥500 for guests"
                   value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="e-summary">One line about it</label>
          <input id="e-summary" type="text" maxLength={200}
                 placeholder="Tika, jamara and the longest lunch of the year."
                 value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="e-highlights">
            What happens — one per line <span className="muted">(optional)</span>
          </label>
          <textarea id="e-highlights" rows={5}
                    placeholder={'Tika and jamara from the elders\nFull Nepali lunch\nOpen to Japanese neighbours'}
                    value={highlights} onChange={(e) => setHighlights(e.target.value)} />
        </div>
        <button className="btn btn--primary" type="submit" disabled={busy}>
          <Icon name="send" />{busy ? 'Sending…' : 'Send to the committee'}
        </button>
        {error && <p className="form-note form-note--error">{error}</p>}
        <p className="form-note">
          A committee member publishes it. You will not be able to edit it here
          afterwards, which is why they check it first.
        </p>
      </form>
    </div>
  )
}
