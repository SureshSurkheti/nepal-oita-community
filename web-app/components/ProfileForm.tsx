'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { compressImage, describeSaving } from '@/lib/image'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'
import { Spinner } from './Spinner'
import type { Member } from '@/lib/types'

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 25 * 1024 * 1024

/* People type "instagram.com/name", or "@name", or paste the whole thing with
   tracking parameters on the end. Rejecting any of those would be pedantry, so
   the scheme is added if it is missing and the value is otherwise left alone —
   what goes in the href has to be absolute or the browser reads it as a path on
   this site, which is how you get a link to nepal-oita.com/instagram.com/name. */
function tidyUrl(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v.replace(/^\/+/, '')}`
}

export function ProfileForm({
  member,
  currentPhotoUrl,
}: {
  member: Member
  currentPhotoUrl: string | null
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl)
  const [blob, setBlob] = useState<Blob | null>(null)
  /* The extension has to match the bytes. compressImage returns WebP where the
     browser can encode it and JPEG where it cannot, so the key cannot be a
     hard-coded '.jpg' — a WebP served as image/jpeg is a photograph that does
     not render. */
  const [ext, setExt] = useState<'webp' | 'jpg' | 'png'>('jpg')
  const [profession, setProfession] = useState(member.profession ?? '')
  /* All three now live on `members`, which is public, rather than on
     member_contacts, which is not. A Facebook or Instagram handle is already
     public wherever it points; the only thing keeping it in the private table
     achieved was that it could never be shown. The phone number stays where it
     was. */
  const [facebook, setFacebook] = useState(member.facebook_url ?? '')
  const [instagram, setInstagram] = useState(member.instagram_url ?? '')
  const [tiktok, setTiktok] = useState(member.tiktok_url ?? '')
  const [note, setNote] = useState<string | null>(null)
  const [bad, setBad] = useState(false)
  const [busy, setBusy] = useState(false)

  function say(message: string, isError = false) {
    setNote(message)
    setBad(isError)
  }

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!OK_TYPES.includes(file.type)) {
      event.target.value = ''
      say('That file is not a JPEG, PNG or WebP image.', true)
      return
    }
    if (file.size > MAX_BYTES) {
      event.target.value = ''
      say(`That photo is ${Math.round(file.size / 1048576)} MB, which is too big to handle here.`, true)
      return
    }

    say('Preparing your photo…')
    try {
      const out = await compressImage(file, { maxEdge: 512, square: true })
      setBlob(out.blob)
      setExt(out.ext)
      setPreview(URL.createObjectURL(out.blob))
      say(`That is how it will be cropped — nothing off the top. ${describeSaving(out)}. Now press Save.`)
    } catch {
      event.target.value = ''
      say('That image could not be read. Try a different file.', true)
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    const supabase = createClient()

    try {
      let photoPath = member.photo_path

      if (blob) {
        /* Inside the member's own folder, which is what the storage policy
           checks — the first path segment must equal their slug. A timestamp
           rather than a fixed name so the CDN cannot serve the old portrait
           from cache after a replacement. */
        const path = `${member.slug}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('member-photos')
          .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false })
        if (uploadError) throw new Error(`upload: ${uploadError.message}`)
        photoPath = path
      }

      /* Only the columns a member is granted. Trying to send `role` here would
         be rejected by Postgres, not by this component. */
      const { error: memberError } = await supabase
        .from('members')
        .update({
          profession: profession.trim() || null,
          photo_path: photoPath,
          facebook_url: tidyUrl(facebook),
          instagram_url: tidyUrl(instagram),
          tiktok_url: tidyUrl(tiktok),
        })
        .eq('id', member.id)
      if (memberError) throw new Error(`profile: ${memberError.message}`)

      setBlob(null)
      say('Saved, and live on the members page for everybody.')
      router.refresh()
    } catch (err) {
      say(err instanceof Error ? err.message : 'Could not save just now.', true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="profile-form panel" onSubmit={save}>
      <p className="profile-who">
        {member.name}
        {member.role && <> · <span className="profile-who__role">{member.role}</span></>}
      </p>

      <div className="upload">
        <span className="avatar avatar--crimson avatar--upload" aria-hidden="true">
          {member.initials ?? member.name.charAt(0)}
          {preview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="profile-preview is-loaded" src={preview} alt="" />
          )}
        </span>
        <div className="field">
          <label htmlFor="photo">Your photo</label>
          <input ref={fileRef} id="photo" type="file"
                 accept="image/jpeg,image/png,image/webp" onChange={onPick} />
          <p className="form-note">
            Straight off your phone is fine. It is cropped square and shrunk here
            before it is uploaded.
          </p>
        </div>
      </div>

      <div className="field">
        <label htmlFor="profession">Profession</label>
        <input id="profession" type="text" maxLength={60}
               placeholder="Care worker, student, chef…"
               value={profession} onChange={(e) => setProfession(e.target.value)} />
      </div>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="facebook">Facebook <span className="muted">(optional)</span></label>
          <input id="facebook" type="text" inputMode="url" placeholder="facebook.com/yourname"
                 value={facebook} onChange={(e) => setFacebook(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="instagram">Instagram <span className="muted">(optional)</span></label>
          <input id="instagram" type="text" inputMode="url" placeholder="instagram.com/yourname"
                 value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tiktok">TikTok <span className="muted">(optional)</span></label>
          <input id="tiktok" type="text" inputMode="url" placeholder="tiktok.com/@yourname"
                 value={tiktok} onChange={(e) => setTiktok(e.target.value)} />
        </div>
      </div>

      <p className="form-note u-mb-15">
        Your name, photo, profession and these links are shown to anyone. Your
        phone number is shown only to other verified members, and only the
        committee can change it.
      </p>

      <button className="btn btn--primary" type="submit" disabled={busy}>
        {busy ? <Spinner /> : <Icon name="check" />}
        {busy ? 'Saving…' : 'Save my profile'}
      </button>
      {note && <p className={`form-note${bad ? ' form-note--error' : ''}`}>{note}</p>}
    </form>
  )
}
