'use client'

import { useRef, useState } from 'react'
import { setMemberProfile, setMemberWelcome, type ActionResult } from '@/app/[lang]/admin/members/actions'
import { compressImage, describeSaving } from '@/lib/image'
import { supabaseEnv } from '@/lib/env'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'
import { Spinner } from './Spinner'
import type { Member } from '@/lib/types'

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 25 * 1024 * 1024

function photoUrl(path: string | null): string | null {
  if (!path) return null
  return `${supabaseEnv().url}/storage/v1/object/public/member-photos/${path}`
}

/* The committee filling in a card for somebody who cannot do it themselves.
 *
 * Most of the register has never logged in, and a good few never will — the
 * photographs arrive in a message to the committee instead. Until now there was
 * nowhere to put them: /me is the only page that could set a portrait, and only
 * for the person whose card it is.
 *
 * WHAT THIS DOES NOT DO
 * Name, role, category and phone number are not here. They are already on this
 * page, on the row above, through admin_upsert_member and
 * admin_set_member_contact. Duplicating them in a second form is how two forms
 * end up disagreeing about which one saved last.
 *
 * NULL VERSUS EMPTY, AND WHY THE FIELD IS SOMETIMES ABSENT
 * `photo_path` is only put in the FormData when there is something to say about
 * it: a new file was uploaded, or the picture is being taken off. Left out, the
 * server action sends null and the database leaves the column alone. Without
 * that, saving a corrected profession would clear the portrait every time. */
export function AdminMemberProfile({ member, onDone }: {
  member: Member
  onDone: (result: ActionResult) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(photoUrl(member.photo_path))
  const [blob, setBlob] = useState<Blob | null>(null)
  const [ext, setExt] = useState<'webp' | 'jpg' | 'png'>('jpg')
  const [dropped, setDropped] = useState(false)     // the picture is being removed
  const [profession, setProfession] = useState(member.profession ?? '')
  const [facebook, setFacebook] = useState(member.facebook_url ?? '')
  const [instagram, setInstagram] = useState(member.instagram_url ?? '')
  const [tiktok, setTiktok] = useState(member.tiktok_url ?? '')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  /* The welcome message, and it is deliberately NOT part of `save()` below.
     It is a different person's words going to a different place — the front
     page rather than this card — and it goes through its own database function
     because 0026 may not have been run yet. Keeping it on its own button means
     a database that is a migration behind loses the welcome and nothing else;
     folded into Save, it would take the photograph and the profession with it. */
  const w = member as unknown as { welcome?: string | null; welcome_ne?: string | null }
  const [welcome, setWelcome] = useState(w.welcome ?? '')
  const [welcomeNe, setWelcomeNe] = useState(w.welcome_ne ?? '')
  const [wBusy, setWBusy] = useState(false)
  const [wNote, setWNote] = useState<string | null>(null)

  async function saveWelcome() {
    setWBusy(true); setWNote(null)
    const fd = new FormData()
    fd.set('member_id', member.id)
    fd.set('welcome', welcome)
    fd.set('welcome_ne', welcomeNe)
    const r = await setMemberWelcome(fd)
    setWBusy(false)
    setWNote(r.message)
  }

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!OK_TYPES.includes(file.type)) {
      event.target.value = ''
      setNote('That file is not a JPEG, PNG or WebP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      event.target.value = ''
      setNote(`That photo is ${Math.round(file.size / 1048576)} MB, which is too big to handle here.`)
      return
    }

    try {
      const out = await compressImage(file, { maxEdge: 512, square: true })
      setBlob(out.blob)
      setExt(out.ext)
      setDropped(false)
      setPreview(URL.createObjectURL(out.blob))
      setNote(`That is how it will be cropped — nothing off the top. ${describeSaving(out)}. Now press Save.`)
    } catch {
      event.target.value = ''
      setNote('That image could not be read. Try a different file.')
    }
  }

  function dropPhoto() {
    setBlob(null)
    setDropped(true)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
    setNote('The picture comes off when you press Save. Their initials go back on the card.')
  }

  async function save() {
    setBusy(true)
    setNote(null)
    try {
      let uploaded: string | null = null

      if (blob) {
        /* The folder is named after the member's slug, which is the convention
           0003 built the member policies around. An admin is not restricted to
           one folder any more (0019), but keeping the convention is what makes
           the member's own uploads and the committee's land in the same place —
           otherwise a member who later claims their card would find their
           portrait somewhere they have no access to.

           A timestamp rather than a fixed name, so the CDN cannot serve the old
           portrait from cache after a replacement. */
        const path = `${member.slug}/${Date.now()}.${ext}`
        const { error } = await createClient().storage
          .from('member-photos')
          .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false })
        if (error) throw new Error(`Could not upload the photo: ${error.message}`)
        uploaded = path
      }

      const fd = new FormData()
      fd.set('member_id', member.id)
      fd.set('profession', profession)
      fd.set('facebook_url', facebook)
      fd.set('instagram_url', instagram)
      fd.set('tiktok_url', tiktok)
      // Absent unless there is something to say. See the note above the component.
      if (uploaded) fd.set('photo_path', uploaded)
      else if (dropped) fd.set('photo_path', '')

      onDone(await setMemberProfile(fd))
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not save just now.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="admin-card-edit">
      <span className="admin-card-edit__photo">
        {preview
          ? /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt={`${member.name}, as the card will show them`} />
          : <span className="admin-card-edit__initials" aria-hidden="true">
              {member.initials ?? member.name.charAt(0)}
            </span>}
      </span>

      <span className="admin-card-edit__fields">
        <span className="field">
          <label htmlFor={`ph-${member.id}`}>Their photo</label>
          <input id={`ph-${member.id}`} ref={fileRef} type="file"
                 accept="image/jpeg,image/png,image/webp" onChange={onPick} />
        </span>

        <span className="field">
          <label htmlFor={`pr-${member.id}`}>
            Profession <span className="muted">(shown under their name)</span>
          </label>
          <input id={`pr-${member.id}`} type="text" maxLength={80}
                 placeholder="Student · Care worker · Chef · Engineer"
                 value={profession} onChange={(e) => setProfession(e.target.value)} />
        </span>

        <span className="field">
          <label htmlFor={`fb-${member.id}`}>Facebook <span className="muted">(optional)</span></label>
          <input id={`fb-${member.id}`} type="text" inputMode="url"
                 placeholder="facebook.com/their-name"
                 value={facebook} onChange={(e) => setFacebook(e.target.value)} />
        </span>

        <span className="field">
          <label htmlFor={`ig-${member.id}`}>Instagram <span className="muted">(optional)</span></label>
          <input id={`ig-${member.id}`} type="text" inputMode="url"
                 placeholder="instagram.com/their-name"
                 value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        </span>

        <span className="field">
          <label htmlFor={`tt-${member.id}`}>TikTok <span className="muted">(optional)</span></label>
          <input id={`tt-${member.id}`} type="text" inputMode="url"
                 placeholder="tiktok.com/@their-name"
                 value={tiktok} onChange={(e) => setTiktok(e.target.value)} />
        </span>

        {/* The home-page welcome, for office holders only.
            
            Not offered on a general member's card, because the band is a word
            from whoever holds the office — a message signed by somebody with no
            role under their name would be a stranger talking on the front page.
            The component reads `category` rather than naming a person, so it
            follows the committee instead of a deploy. */}
        {member.category === 'leadership' && (
          <>
            <span className="field">
              <label htmlFor={`wl-${member.id}`}>
                Their welcome message on the home page{' '}
                <span className="muted">(their own words — leave empty for no message)</span>
              </label>
              <textarea id={`wl-${member.id}`} rows={4} maxLength={600}
                        placeholder="Two or three sentences, in the first person. Nothing appears on the home page while this is empty."
                        value={welcome} onChange={(e) => setWelcome(e.target.value)} />
            </span>
            <span className="field">
              <label htmlFor={`wn-${member.id}`}>
                The same message <span className="muted">(नेपालीमा — optional)</span>
              </label>
              <textarea id={`wn-${member.id}`} rows={4} maxLength={600} lang="ne"
                        value={welcomeNe} onChange={(e) => setWelcomeNe(e.target.value)} />
            </span>
            <span className="cluster">
              <button className="btn btn--sm btn--ghost" type="button"
                      disabled={wBusy} onClick={saveWelcome}>
                {wBusy ? <Spinner /> : <Icon name="send" />}
                {wBusy ? 'Saving…' : 'Save the welcome message'}
              </button>
            </span>
            {wNote && <span className="form-note">{wNote}</span>}
            <span className="form-note">
              <Icon name="heart" /> This goes on the front page with their name,
              their office and their photograph under it. Write what they wrote,
              not what you think they would have written.
            </span>
          </>
        )}

        <span className="cluster">
          <button className="btn btn--sm btn--primary" type="button"
                  disabled={busy} onClick={save}>
            {busy ? <Spinner /> : <Icon name="check" />}{busy ? 'Saving…' : 'Save this card'}
          </button>
          {member.photo_path && !dropped && (
            <button className="btn btn--sm btn--ghost" type="button"
                    disabled={busy} onClick={dropPhoto}>
              Take the photo off
            </button>
          )}
          <button className="btn btn--sm btn--ghost" type="button"
                  disabled={busy}
                  onClick={() => onDone({ ok: true, message: '' })}>
            Cancel
          </button>
        </span>

        {note && <span className="form-note">{note}</span>}
        <span className="form-note">
          <Icon name="users" /> If they can sign in, they can do all of this
          themselves at <strong>My profile</strong>. This is for the people who
          cannot — and whatever you save here, they can change afterwards.
        </span>
      </span>
    </span>
  )
}
