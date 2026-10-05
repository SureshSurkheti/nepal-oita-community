'use client'

import { useState, useTransition } from 'react'
import { compressImage, describeSaving } from '@/lib/image'
import { createClient } from '@/lib/supabase/client'
import { saveEvent, deleteEvent, togglePublished, type Result } from '@/app/[lang]/admin/events/actions'
import { supabaseEnv } from '@/lib/env'
import { Icon } from './Sprite'
import { AdminPanel, AdminSection, AdminAdvanced, AdminActions } from './AdminForm'

/* Not imported from lib/content: that module pulls in the server Supabase
   client, which reaches for next/headers and cannot exist in a client bundle.
   Three lines here beats splitting that module. */
function coverUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return `${supabaseEnv().url}/storage/v1/object/public/site-photos/${path}`
}

export type AdminEvent = {
  id: string; slug: string; title: string
  summary: string | null; body: string | null
  /* The Nepali half. Optional on the type, because the columns arrive with
     migration 0020/0021 and the admin page has to keep working on a database
     that has not had it run — see nepaliFields in the action. */
  title_ne?: string | null; summary_ne?: string | null; body_ne?: string | null
  highlights_ne?: string[]
  event_date: string; start_time: string | null; end_time: string | null
  place: string | null; category: string | null; cost: string | null
  accent: string; register_email: string | null; is_published: boolean
  cover_path: string | null
  highlights: string[]
}

const CATEGORIES = ['Festival', 'Community', 'Sports', 'Cultural', 'Food', 'Students']
const ACCENTS = ['crimson', 'indigo', 'moss', 'gold']

export function EventAdmin({ events, today }: { events: AdminEvent[]; today: string }) {
  const [pending, startTransition] = useTransition()
  /* The cover photograph. Uploaded to storage the moment it is picked, so by the
     time Save runs the form only has to carry the key — the same two-step the
     gallery uploader uses. Doing it the other way round (save the row, then the
     file) leaves a row pointing at a photograph that does not exist if the
     upload fails, which renders as a broken card nobody can explain. */
  const [coverPath, setCoverPath] = useState('')
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverBusy, setCoverBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [editing, setEditing] = useState<AdminEvent | 'new' | null>(null)

  async function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setResult({ ok: false, message: 'A JPEG, PNG or WebP, please.' })
      e.target.value = ''
      return
    }
    setCoverBusy(true); setResult(null)
    try {
      /* 1600px, the same as a gallery photograph — an event cover is shown at
         about 400px on a card and full width on the detail page, so there is
         nothing to gain above that and a camera file is 20x the size. */
      const out = await compressImage(file, { maxEdge: 1600 })
      const key = `events/${Date.now()}.${out.ext}`
      const { error } = await createClient().storage.from('site-photos')
        .upload(key, out.blob, { contentType: out.contentType, upsert: false })
      if (error) throw new Error(error.message)
      setCoverPath(key)
      setCoverPreview(URL.createObjectURL(out.blob))
      setResult({ ok: true, message: `Photograph uploaded — ${describeSaving(out)}. Now press Save.` })
    } catch (err) {
      setResult({ ok: false, message: `Could not upload that: ${err instanceof Error ? err.message : 'unknown error'}` })
    } finally {
      setCoverBusy(false)
    }
  }

  const run = (fn: (fd: FormData) => Promise<Result>) => (formData: FormData) =>
    startTransition(async () => {
      const r = await fn(formData)
      setResult(r)
      if (r.ok) { setEditing(null); setCoverPath(''); setCoverPreview(null) }
    })

  const blank: AdminEvent = {
    id: '', slug: '', title: '', summary: '', body: '', event_date: today,
    start_time: '', end_time: '', place: '', category: 'Community', cost: '',
    accent: 'crimson', register_email: 'nepaloitacommunity11@gmail.com',
    is_published: true, cover_path: null, highlights: [],
    title_ne: null, summary_ne: null, body_ne: null, highlights_ne: [],
  }
  const form = editing === 'new' ? blank : editing

  return (
    <>
      {/* Only when no form is open. With one open, AdminActions shows the same
          message at the foot of the form where the Save button is — two copies
          in two places is worse than one in the wrong place. */}
      {result && !form && (
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
        <AdminPanel title={form.title}>
        <form className="panel u-mb-2" action={run(saveEvent)}>
          <h2 className="panel__title">
            <Icon name="calendar" /> {form.id ? `Edit \u201C${form.title}\u201D` : 'New event'}
          </h2>
          <input type="hidden" name="id" value={form.id} />

          <AdminSection title="When and where"
                        hint="The four things somebody needs in order to turn up.">
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
            </div>
          </AdminSection>

          <AdminSection title="The photograph"
                        hint="Shown across the top of the card and the event page. Optional \u2014 without one the card falls back to a pattern.">
            {/* The key travels in the form; the file is already in storage. An
                edit with no new file re-submits whatever the event had, so
                saving a changed time does not silently drop the picture. */}
            <input type="hidden" name="cover_path" value={coverPath || form.cover_path || ''} />
            <div className="cover-pick">
              {(coverPreview || form.cover_path) && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img className="cover-pick__preview"
                     src={coverPreview ?? coverUrl(form.cover_path)!} alt="" />
              )}
              <div>
                <input id="e-cover" type="file" accept="image/jpeg,image/png,image/webp"
                       onChange={pickCover} disabled={coverBusy} />
                <p className="form-note">
                  {coverBusy
                    ? 'Shrinking and uploading\u2026'
                    : coverPath
                      ? 'Uploaded. Press Save to attach it to this event.'
                      : 'Straight off a phone is fine \u2014 it is shrunk here first.'}
                </p>
                {(coverPath || form.cover_path) && (
                  <button className="btn btn--sm btn--ghost" type="button"
                          onClick={() => { setCoverPath(''); setCoverPreview(null) }}>
                    Remove the photograph
                  </button>
                )}
              </div>
            </div>
          </AdminSection>

          <AdminSection title="What to say about it"
                        hint="The one-liner is what appears on the card. The rest is only on the event's own page.">
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
          </AdminSection>

          {/* WHY THIS SECTION EXISTS AT ALL.
              Half this community reads Nepali more comfortably than English, and
              the site has been translated down to the last button — but the
              events, programmes and stories are rows, not code, and until now
              nothing here could write the Nepali ones. So every event added
              after the translation shipped was English on both halves of the
              site, and the Nepali page slowly filled up with English again.
              Worse for being invisible: the page falls back rather than showing
              a blank, so nobody notices.

              Optional, every field. An event with an English title and no
              Nepali one is normal and shows the English on both; the fallback is
              in lib/content and has always worked that way. */}
          <AdminSection title="The same thing in Nepali"
                        hint="Optional. Anything left empty shows the English on the Nepali pages, which is what happens today.">
            <div className="field">
              <label htmlFor="e-title-ne">Title</label>
              <input id="e-title-ne" name="title_ne" defaultValue={form.title_ne ?? ''}
                     lang="ne" placeholder="दशैं उत्सव" />
            </div>
            <div className="field">
              <label htmlFor="e-summary-ne">One line for the card</label>
              <input id="e-summary-ne" name="summary_ne" defaultValue={form.summary_ne ?? ''}
                     lang="ne" maxLength={160} />
            </div>
            <div className="field">
              <label htmlFor="e-body-ne">The longer description</label>
              <textarea id="e-body-ne" name="body_ne" defaultValue={form.body_ne ?? ''}
                        lang="ne" rows={3} />
            </div>
            <div className="field">
              <label htmlFor="e-high-ne">
                What happens <span className="muted">(one per line, in the same order as the English)</span>
              </label>
              <textarea id="e-high-ne" name="highlights_ne" rows={5} lang="ne"
                        defaultValue={(form.highlights_ne ?? []).join('\n')} />
            </div>
          </AdminSection>

          <AdminAdvanced>
            <div className="grid grid--2">
              <div className="field">
                <label htmlFor="e-cost">Cost</label>
                <input id="e-cost" name="cost" defaultValue={form.cost ?? ''}
                       placeholder="Free for members \u00b7 \u00a5500 for guests" />
              </div>
              <div className="field">
                <label htmlFor="e-accent">Colour</label>
                <select id="e-accent" name="accent" defaultValue={form.accent}>
                  {ACCENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="e-email">Register by email</label>
              <input id="e-email" name="register_email" defaultValue={form.register_email ?? ''} />
            </div>
            {form.id && (
              <div className="field">
                <label htmlFor="e-slug">
                  Web address <span className="muted">(changing it breaks old links)</span>
                </label>
                <input id="e-slug" name="slug" defaultValue={form.slug} />
              </div>
            )}
          </AdminAdvanced>

          <AdminActions
            busy={pending || coverBusy}
            saveLabel={form.id ? 'Save changes' : 'Add this event'}
            busyLabel="Saving\u2026"
            onCancel={() => { setEditing(null); setCoverPath(''); setCoverPreview(null) }}
            message={result ? { ok: result.ok, text: result.message } : null}
          />
        </form>
        </AdminPanel>
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
