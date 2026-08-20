'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { savePhoto, deletePhoto, type Result } from '@/app/admin/photos/actions'
import { Icon } from './Sprite'
import type { Photo } from '@/lib/content'

type Row = Photo & { url: string | null }

const CATEGORIES = ['festivals', 'community', 'cultural', 'sports', 'food']
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function PhotoAdmin({ photos }: { photos: Row[] }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<Result | null>(null)
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  const [uploading, setUploading] = useState(false)
  const [path, setPath] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const run = (fn: (fd: FormData) => Promise<Result>) => (formData: FormData) =>
    startTransition(async () => {
      const r = await fn(formData)
      setResult(r)
      if (r.ok) { setEditing(null); setPath(''); setPreview(null) }
    })

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!OK_TYPES.includes(file.type)) {
      setResult({ ok: false, message: 'That file is not a JPEG, PNG or WebP image.' })
      e.target.value = ''
      return
    }

    setUploading(true)
    setResult(null)
    // A timestamped name so replacing a photograph cannot be served stale from
    // the CDN under the old one.
    const clean = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')
    const key = `${Date.now()}-${clean}`
    const { error } = await createClient().storage.from('site-photos')
      .upload(key, file, { contentType: file.type, upsert: false })
    setUploading(false)

    if (error) { setResult({ ok: false, message: `Upload failed: ${error.message}` }); return }
    setPath(key)
    setPreview(URL.createObjectURL(file))
    setResult({ ok: true, message: 'Uploaded. Now give it a caption and save.' })
  }

  const form = editing === 'new'
    ? ({ id: '', storage_path: '', caption: '', alt: '', category: 'community',
         credit: '', credit_url: '', licence: '', licence_url: '', url: null } as unknown as Row)
    : editing

  return (
    <>
      {result && (
        <p className={`form-note${result.ok ? '' : ' form-note--error'}`}>{result.message}</p>
      )}

      {!form && (
        <div className="cluster u-mb-2">
          <button className="btn btn--primary" type="button"
                  onClick={() => { setEditing('new'); setResult(null) }}>
            <Icon name="images" /> Add a photograph
          </button>
        </div>
      )}

      {form && (
        <form className="panel u-mb-2" action={run(savePhoto)}>
          <h2 className="panel__title">
            <Icon name="images" /> {form.id ? 'Edit photograph' : 'New photograph'}
          </h2>
          <input type="hidden" name="id" value={form.id} />
          <input type="hidden" name="storage_path" value={path || form.storage_path} />

          {!form.id && (
            <div className="field">
              <label htmlFor="p-file">The image file</label>
              <input id="p-file" type="file" accept="image/jpeg,image/png,image/webp"
                     onChange={upload} disabled={uploading} />
              <p className="form-note">
                {uploading ? 'Uploading…' : path ? `Uploaded as ${path}` : 'JPEG, PNG or WebP, up to 10 MB.'}
              </p>
            </div>
          )}

          {(preview || form.url) && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview ?? form.url!} alt="" style={{ maxWidth: '260px', borderRadius: '12px' }} />
          )}

          <div className="grid grid--2">
            <div className="field">
              <label htmlFor="p-cap">Caption</label>
              <input id="p-cap" name="caption" defaultValue={form.caption ?? ''} placeholder="Dashain" />
            </div>
            <div className="field">
              <label htmlFor="p-cat">Category</label>
              <select id="p-cat" name="category" defaultValue={form.category ?? 'community'}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="p-alt">
              Description for screen readers <span className="muted">(what is in the picture)</span>
            </label>
            <input id="p-alt" name="alt" defaultValue={form.alt ?? ''} />
          </div>

          <div className="grid grid--2">
            <div className="field">
              <label htmlFor="p-credit">Photographer <span className="muted">(if not ours)</span></label>
              <input id="p-credit" name="credit" defaultValue={form.credit ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="p-credit-url">Link to them</label>
              <input id="p-credit-url" name="credit_url" type="url" defaultValue={form.credit_url ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="p-lic">Licence</label>
              <input id="p-lic" name="licence" defaultValue={form.licence ?? ''} placeholder="CC BY-SA 4.0" />
            </div>
            <div className="field">
              <label htmlFor="p-lic-url">Link to the licence</label>
              <input id="p-lic-url" name="licence_url" type="url" defaultValue={form.licence_url ?? ''} />
            </div>
          </div>
          <p className="form-note u-mb-15">
            If somebody else took it and the licence says attribution is required,
            filling these in is the condition of using it at all.
          </p>

          <div className="cluster">
            <button className="btn btn--primary" type="submit"
                    disabled={pending || uploading || (!form.id && !path)}>
              <Icon name="check" />{pending ? 'Saving…' : 'Save'}
            </button>
            <button className="btn btn--ghost" type="button"
                    onClick={() => { setEditing(null); setPath(''); setPreview(null) }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <h2 className="display-3 u-mb-2">In the gallery</h2>
      {photos.length === 0 ? <p className="muted">No photographs yet.</p> : (
        <div className="tiles tiles--4">
          {photos.map((p) => (
            <div key={p.id} className="tile">
              {p.url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img className="tile__img" src={p.url} alt={p.alt ?? ''} loading="lazy" />
              )}
              <span className="tile__scrim" aria-hidden="true" />
              <span className="tile__cap">
                <span className="tile__caption">{p.caption ?? '(no caption)'}</span>
                <span className="tile__meta">
                  {p.category}{p.licence ? ` · ${p.licence}` : ' · no credit'}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <ul className="roster u-mt-2">
        {photos.map((p) => (
          <li key={p.id}>
            <span className="avatar" aria-hidden="true"><Icon name="images" /></span>
            <span>
              <span className="roster__name">{p.caption ?? p.storage_path}</span><br />
              <span className="roster__meta">
                {p.storage_path}
                {p.credit ? ` · ${p.credit}` : ''}
                {p.licence ? ` · ${p.licence}` : ' · no licence recorded'}
              </span>
              <span className="roster__links">
                <button type="button" onClick={() => { setEditing(p); setResult(null) }}>Edit</button>
                <form action={run(deletePhoto)} style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="storage_path" value={p.storage_path} />
                  <button type="submit" disabled={pending}>Delete</button>
                </form>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
