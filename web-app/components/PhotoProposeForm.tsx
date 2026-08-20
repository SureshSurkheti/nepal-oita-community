'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'

const CATEGORIES = ['festivals', 'community', 'cultural', 'sports'] as const

/* Shrink the long edge to 1600px and re-encode as JPEG.
 *
 * The bucket refuses anything over 10MB and a recent phone camera clears that
 * on its own, so without this a perfectly good photograph fails at the last
 * step with a storage error nobody can act on. 1600px is generous for a gallery
 * tile that renders at a few hundred, and it keeps the upload inside a few
 * hundred kilobytes — which matters most to whoever is uploading it on mobile
 * data at the end of an event. */
async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const max = 1600
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot resize the image.')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image.'))),
      'image/jpeg', 0.85))
}

/* Adding a gallery photograph, for the leadership team.
 *
 * Two writes, in this order, and the order is the point: the FILE first, then
 * the row that points at it. Reversed, a refused upload leaves a row referring
 * to a photograph that does not exist, and the gallery renders a blank tile
 * nobody can explain. Done this way, a refused upload leaves nothing at all.
 *
 * The file goes into <slug>/, which is what the storage policy checks — the
 * committee's own gallery files sit at the root of the bucket, and this cannot
 * land on top of one. */
export function PhotoProposeForm({ memberId, slug }: { memberId: string; slug: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [caption, setCaption] = useState('')
  const [alt, setAlt] = useState('')
  const [category, setCategory] = useState<string>('community')
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) { setPreview(null); return }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError('A JPEG, PNG or WebP, please.')
      e.target.value = ''
      setPreview(null)
      return
    }
    setPreview(URL.createObjectURL(file))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Choose a photograph first.'); return }
    if (!caption.trim()) { setError('A short caption — two or three words.'); return }
    if (!alt.trim()) {
      // Not optional. It is what somebody using a screen reader gets instead of
      // the photograph, and "image" is not a description.
      setError('Please describe what is in the photograph.')
      return
    }

    setBusy(true)
    const supabase = createClient()

    try {
      const blob = await downscale(file)
      const path = `${slug}/${Date.now()}.jpg`

      const { error: uploadError } = await supabase.storage.from('site-photos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) throw new Error(`Could not upload the file: ${uploadError.message}`)

      const { error: rowError } = await supabase.from('photos').insert({
        storage_path: path,
        caption: caption.trim(),
        alt: alt.trim(),
        category,
        is_published: false,
        submitted_by: memberId,
      })
      if (rowError) {
        /* The file is up and the row is not. Say so plainly rather than
           reporting a generic failure: the committee can find and remove the
           stray file, and nobody is left wondering whether it arrived. */
        throw new Error(`The photograph uploaded but could not be filed: ${rowError.message}. `
          + 'Tell the committee.')
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that just now.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="panel">
        <h2 className="panel__title"><Icon name="check" /> Sent to the committee</h2>
        <p>
          Uploaded, but not in the gallery yet — a committee member publishes it.
          You cannot change or remove it from here, so tell them if something is
          wrong with it.
        </p>
      </div>
    )
  }

  return (
    <div className="panel">
      <h2 className="panel__title"><Icon name="images" /> Add a photograph</h2>
      <form onSubmit={submit}>
        <div className="upload">
          <span className="avatar avatar--moss avatar--upload" aria-hidden="true">
            <Icon name="images" />
            {preview && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img className="profile-preview is-loaded" src={preview} alt="" />
            )}
          </span>
          <div className="field">
            <label htmlFor="ph-file">The photograph</label>
            <input ref={fileRef} id="ph-file" type="file"
                   accept="image/jpeg,image/png,image/webp" onChange={onPick} />
            <p className="form-note">
              Straight off your phone is fine — it is shrunk here before uploading.
            </p>
          </div>
        </div>

        <div className="field-grid">
          <div className="field">
            <label htmlFor="ph-caption">Caption</label>
            <input id="ph-caption" type="text" required maxLength={60}
                   placeholder="Dashain lunch"
                   value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ph-cat">Which part of the gallery</label>
            <select id="ph-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="ph-alt">What is in it</label>
          <input id="ph-alt" type="text" required maxLength={140}
                 placeholder="Members serving dal bhat from steel trays at the cultural hall"
                 value={alt} onChange={(e) => setAlt(e.target.value)} />
          <p className="form-note">
            This is what somebody who cannot see the photograph gets instead, so
            describe it rather than naming it.
          </p>
        </div>

        <button className="btn btn--primary" type="submit" disabled={busy}>
          <Icon name="send" />{busy ? 'Uploading…' : 'Send to the committee'}
        </button>
        {error && <p className="form-note form-note--error">{error}</p>}
        <p className="form-note">
          A committee member publishes it. Do not upload a photograph of somebody
          who would rather not be on the site — that is far harder to undo than to
          check first.
        </p>
      </form>
    </div>
  )
}
