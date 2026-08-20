'use client'

import { useState, useTransition } from 'react'
import { saveEvent, deleteEvent, togglePublished, type Result } from '@/app/admin/events/actions'
import { Icon } from './Sprite'

export type AdminEvent = {
  id: string; slug: string; title: string
  summary: string | null; body: string | null
  event_date: string; start_time: string | null; end_time: string | null
  place: string | null; category: string | null; cost: string | null
  accent: string; register_email: string | null; is_published: boolean
  highlights: string[]
}

const CATEGORIES = ['Festival', 'Community', 'Sports', 'Cultural', 'Food', 'Students']
const ACCENTS = ['crimson', 'indigo', 'moss', 'gold']

export function EventAdmin({ events, today }: { events: AdminEvent[]; today: string }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<Result | null>(null)
  const [editing, setEditing] = useState<AdminEvent | 'new' | null>(null)

  const run = (fn: (fd: FormData) => Promise<Result>) => (formData: FormData) =>
    startTransition(async () => {
      const r = await fn(formData)
      setResult(r)
      if (r.ok) setEditing(null)
    })

  const blank: AdminEvent = {
    id: '', slug: '', title: '', summary: '', body: '', event_date: today,
    start_time: '', end_time: '', place: '', category: 'Community', cost: '',
    accent: 'crimson', register_email: 'nepaloitacommunity11@gmail.com',
    is_published: true, highlights: [],
  }
  const form = editing === 'new' ? blank : editing

  return (
    <>
      {result && (
        <p className={`form-note${result.ok ? '' : ' form-note--error'}`}>{result.message}</p>
      )}

      {!form && (
        <div className="cluster u-mb-2">
          <button className="btn btn--primary" type="button" onClick={() => setEditing('new')}>
            <Icon name="calendar" /> Add an event
          </button>
        </div>
      )}

      {form && (
        <form className="panel u-mb-2" action={run(saveEvent)}>
          <h2 className="panel__title">
            <Icon name="calendar" /> {form.id ? `Edit “${form.title}”` : 'New event'}
          </h2>
          <input type="hidden" name="id" value={form.id} />

          <div className="grid grid--2">
            <div className="field">
              <label htmlFor="e-title">Title</label>
              <input id="e-title" name="title" defaultValue={form.title} required
                     placeholder="Dashain Celebration" />
            </div>
            <div className="field">
              <label htmlFor="e-date">Date</label>
              <input id="e-date" name="event_date" type="date" defaultValue={form.event_date} required />
            </div>
            <div className="field">
              <label htmlFor="e-start">Starts</label>
              <input id="e-start" name="start_time" defaultValue={form.start_time ?? ''} placeholder="11:00" />
            </div>
            <div className="field">
              <label htmlFor="e-end">Ends</label>
              <input id="e-end" name="end_time" defaultValue={form.end_time ?? ''} placeholder="18:00" />
            </div>
            <div className="field">
              <label htmlFor="e-place">Place</label>
              <input id="e-place" name="place" defaultValue={form.place ?? ''} placeholder="Oita Cultural Hall" />
            </div>
            <div className="field">
              <label htmlFor="e-cat">Category</label>
              <select id="e-cat" name="category" defaultValue={form.category ?? 'Community'}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="e-cost">Cost</label>
              <input id="e-cost" name="cost" defaultValue={form.cost ?? ''} placeholder="Free for members · ¥500 for guests" />
            </div>
            <div className="field">
              <label htmlFor="e-accent">Colour</label>
              <select id="e-accent" name="accent" defaultValue={form.accent}>
                {ACCENTS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="e-summary">One line for the card</label>
            <input id="e-summary" name="summary" defaultValue={form.summary ?? ''} maxLength={160}
                   placeholder="Tika, jamara and the longest lunch of the year." />
          </div>
          <div className="field">
            <label htmlFor="e-body">The longer description</label>
            <textarea id="e-body" name="body" defaultValue={form.body ?? ''} rows={3} />
          </div>
          <div className="field">
            <label htmlFor="e-high">What happens <span className="muted">(one per line)</span></label>
            <textarea id="e-high" name="highlights" rows={5}
                      defaultValue={form.highlights.join('\n')}
                      placeholder={'Tika and jamara from the elders\nFull Nepali lunch'} />
          </div>
          <div className="field">
            <label htmlFor="e-email">Register by email</label>
            <input id="e-email" name="register_email" defaultValue={form.register_email ?? ''} />
          </div>
          {form.id && (
            <div className="field">
              <label htmlFor="e-slug">Web address <span className="muted">(changing it breaks old links)</span></label>
              <input id="e-slug" name="slug" defaultValue={form.slug} />
            </div>
          )}

          <div className="cluster">
            <button className="btn btn--primary" type="submit" disabled={pending}>
              <Icon name="check" />{pending ? 'Saving…' : 'Save event'}
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <h2 className="display-3 u-mb-2">All events</h2>
      <ul className="roster">
        {events.map((e) => (
          <li key={e.id}>
            <span className="avatar" aria-hidden="true">
              {new Date(e.event_date + 'T12:00:00Z').getUTCDate()}
            </span>
            <span>
              <span className="roster__name">
                {e.title}
                {!e.is_published && <span className="text-sm muted"> · hidden</span>}
                {e.event_date < today && <span className="text-sm muted"> · past</span>}
              </span><br />
              <span className="roster__meta">
                {e.event_date}
                {e.start_time ? ` · ${e.start_time}` : ''}
                {e.place ? ` · ${e.place}` : ''}
                {e.category ? ` · ${e.category}` : ''}
                {` · ${e.highlights.length} highlight${e.highlights.length === 1 ? '' : 's'}`}
              </span>
              <span className="roster__links">
                <button type="button" onClick={() => { setEditing(e); setResult(null) }}>Edit</button>
                <form action={run(togglePublished)} style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="to" value={String(!e.is_published)} />
                  <button type="submit" disabled={pending}>
                    {e.is_published ? 'Hide from site' : 'Publish'}
                  </button>
                </form>
                <a href={`/events/${e.slug}`}>View page</a>
                <form action={run(deleteEvent)} style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" disabled={pending}>Delete</button>
                </form>
              </span>
            </span>
          </li>
        ))}
      </ul>
      {events.length === 0 && <p className="muted">No events yet.</p>}
    </>
  )
}
