'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { refreshStories } from '@/app/stories/actions'
import { Icon } from './Sprite'
import { Spinner } from './Spinner'

export type OwnStory = {
  id: string
  quote: string
  author_role: string | null
  status: 'pending' | 'approved' | 'rejected'
}

const STATUS_NOTE: Record<OwnStory['status'], string> = {
  pending: 'Waiting for the committee to read it.',
  approved: 'Published — it is on the site.',
  rejected: 'Not published. Ask the committee if you would like to know why.',
}

/* "Tell us your story", for members.
 *
 * The submission goes in as `pending` and nothing puts it on the site but a
 * committee member approving it — and that is enforced by the database, not
 * here: `status` is missing from the INSERT grant, so it takes its default
 * whatever this form sends. There is no version of this component that could
 * publish its own text.
 *
 * `member_id` is sent because the insert policy requires it to be one of the
 * caller's own member rows. It is not a claim about who you are that anybody
 * trusts — send somebody else's and the policy rejects the row.
 *
 * EDITING THEIR OWN, since 0018. The words are theirs, so a typo should not mean
 * emailing the committee and asking somebody else to retype it. What they cannot
 * touch is `status` — it is in no grant, so nobody approves their own story — and
 * `author_name`, which is not offered here because a member's name is their card's
 * and the card is the committee's to set. */
export function StoryForm({ member, own }: {
  member: { id: string; name: string; role: string | null; photo_path: string | null } | null
  own: OwnStory[]
}) {
  const router = useRouter()
  const [role, setRole] = useState(member?.role ?? '')
  const [quote, setQuote] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Which of their own stories is open for editing, and the draft in the boxes.
     Held here rather than in a child component because the list of their stories
     is already here and splitting it would mean passing the whole thing down. */
  const [editId, setEditId] = useState<string | null>(null)
  const [editQuote, setEditQuote] = useState('')
  const [editRole, setEditRole] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)

  const openEdit = (st: OwnStory) => {
    setEditId(st.id)
    setEditQuote(st.quote)
    setEditRole(st.author_role ?? '')
    setConfirmId(null)
    setRowError(null)
  }

  async function saveEdit(id: string) {
    const text = editQuote.trim()
    if (text.length < 40) { setRowError('A few sentences, please — at least forty characters.'); return }
    setBusy(true); setRowError(null)
    const { error: e } = await createClient().from('stories')
      .update({ quote: text, author_role: editRole.trim() || null })
      .eq('id', id)
    setBusy(false)
    if (e) { setRowError(`Could not save that. ${e.message}`); return }
    // Clears the cached approved-stories read, or an edit to a published story
    // stays invisible for up to five minutes.
    await refreshStories()
    setEditId(null)
    router.refresh()
  }

  async function removeStory(id: string) {
    setBusy(true); setRowError(null)
    const { error: e } = await createClient().from('stories').delete().eq('id', id)
    setBusy(false)
    if (e) { setRowError(`Could not delete that. ${e.message}`); return }
    await refreshStories()
    setConfirmId(null)
    router.refresh()
  }

  if (!member) {
    return (
      <div className="panel">
        <h2 className="panel__title"><Icon name="send" /> Tell us your story</h2>
        <p className="u-mb-15">
          This is for members. Sign in with your registered number and you can
          write yours here — the committee reads it before it goes on the site.
        </p>
        <a className="btn btn--primary" href="/sign-in">
          <Icon name="shield" /> Sign in
        </a>
      </div>
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const text = quote.trim()
    if (text.length < 40) {
      setError('A few sentences, please — at least forty characters.')
      return
    }

    setBusy(true)
    const { error: insertError } = await createClient().from('stories').insert({
      member_id: member!.id,
      author_name: member!.name,
      author_role: role.trim() || null,
      quote: text,
      // Reuse the portrait already on their card rather than asking for another.
      photo_path: member!.photo_path,
    })
    setBusy(false)

    if (insertError) { setError(`Could not send that. ${insertError.message}`); return }
    setSent(true)
    setQuote('')
  }

  return (
    <div className="panel">
      <h2 className="panel__title"><Icon name="send" /> Tell us your story</h2>

      {own.length > 0 && (
        <ul className="roster u-mb-15">
          {own.map((st) => (
            <li key={st.id}>
              <span className="avatar" aria-hidden="true">
                <Icon name={st.status === 'approved' ? 'check' : 'clock'} />
              </span>
              <span>
                <span className="roster__name">
                  Your story <span className="text-sm muted">· {st.status}</span>
                </span><br />
                <span className="roster__meta">{STATUS_NOTE[st.status]}</span><br />

                {editId === st.id ? (
                  /* Inline, under the entry it changes. The alternative was a
                     second copy of the form further down the page, which leaves
                     somebody scrolling to check they are editing the right one. */
                  <span className="story-edit">
                    <span className="field">
                      <label htmlFor={`e-role-${st.id}`}>
                        What to put under your name <span className="muted">(optional)</span>
                      </label>
                      <input id={`e-role-${st.id}`} type="text" maxLength={80}
                             value={editRole} onChange={(e) => setEditRole(e.target.value)} />
                    </span>
                    <span className="field">
                      <label htmlFor={`e-quote-${st.id}`}>Your story</label>
                      <textarea id={`e-quote-${st.id}`} rows={5} maxLength={1200}
                                value={editQuote} onChange={(e) => setEditQuote(e.target.value)} />
                    </span>
                    <span className="cluster">
                      <button className="btn btn--sm btn--primary" type="button"
                              disabled={busy} onClick={() => saveEdit(st.id)}>
                        {busy ? <Spinner /> : <Icon name="check" />}{busy ? 'Saving…' : 'Save'}
                      </button>
                      <button className="btn btn--sm btn--ghost" type="button"
                              disabled={busy} onClick={() => setEditId(null)}>
                        Cancel
                      </button>
                    </span>
                    {st.status === 'approved' && (
                      <span className="form-note">
                        This one is published, so the change is live as soon as you save.
                      </span>
                    )}
                  </span>
                ) : confirmId === st.id ? (
                  <span className="story-edit">
                    <span className="minute-tools__warn">
                      Delete your story? This cannot be undone.
                    </span>
                    <span className="cluster">
                      <button className="btn btn--sm btn--danger" type="button"
                              disabled={busy} onClick={() => removeStory(st.id)}>
                        {busy ? <Spinner /> : <Icon name="close" />}{busy ? 'Deleting…' : 'Yes, delete it'}
                      </button>
                      <button className="btn btn--sm btn--ghost" type="button"
                              disabled={busy} onClick={() => setConfirmId(null)}>
                        Keep it
                      </button>
                    </span>
                  </span>
                ) : (
                  <>
                    <span className="roster__meta">
                      &ldquo;{st.quote.slice(0, 140)}{st.quote.length > 140 ? '…' : ''}&rdquo;
                    </span>
                    <span className="roster__links">
                      <button type="button" data-tone="go"
                              onClick={() => openEdit(st)}>Edit</button>
                      <button type="button" data-tone="danger"
                              onClick={() => { setConfirmId(st.id); setRowError(null) }}>
                        Delete
                      </button>
                    </span>
                  </>
                )}
                {rowError && (editId === st.id || confirmId === st.id) && (
                  <span className="form-note form-note--error">{rowError}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {sent ? (
        <p className="form-note">
          Thank you — it has gone to the committee. Nothing appears on the site
          until one of them approves it, so give them a few days.
        </p>
      ) : (
        <form onSubmit={submit}>
          <p className="u-mb-15">
            Writing as <strong>{member.name}</strong>. In English, Nepali or
            Japanese — whichever you would rather.
          </p>
          <div className="field">
            <label htmlFor="story-role">
              What to put under your name <span className="muted">(optional)</span>
            </label>
            <input id="story-role" type="text" maxLength={80}
                   placeholder="Student · Care worker · Parent · Kitchen staff"
                   value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="story-quote">Your story</label>
            <textarea id="story-quote" required maxLength={1200} rows={6}
                      placeholder="How your first few months here went, or a day somebody helped you out. A few sentences is plenty."
                      value={quote} onChange={(e) => setQuote(e.target.value)} />
          </div>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? <Spinner /> : <Icon name="send" />}{busy ? 'Sending…' : 'Send to the committee'}
          </button>
          {error && <p className="form-note form-note--error">{error}</p>}
          <p className="form-note">
            The committee can publish it, decline it, or delete it. You can send
            another at any time.
          </p>
        </form>
      )}
    </div>
  )
}
