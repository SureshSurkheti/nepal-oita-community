'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'

export type OwnStory = { id: string; quote: string; status: 'pending' | 'approved' | 'rejected' }

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
 * trusts — send somebody else's and the policy rejects the row. */
export function StoryForm({ member, own }: {
  member: { id: string; name: string; role: string | null; photo_path: string | null } | null
  own: OwnStory[]
}) {
  const [role, setRole] = useState(member?.role ?? '')
  const [quote, setQuote] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          {own.map((s) => (
            <li key={s.id}>
              <span className="avatar" aria-hidden="true">
                <Icon name={s.status === 'approved' ? 'check' : 'clock'} />
              </span>
              <span>
                <span className="roster__name">
                  Your story <span className="text-sm muted">· {s.status}</span>
                </span><br />
                <span className="roster__meta">{STATUS_NOTE[s.status]}</span><br />
                <span className="roster__meta">
                  &ldquo;{s.quote.slice(0, 140)}{s.quote.length > 140 ? '…' : ''}&rdquo;
                </span>
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
                   placeholder="Student, APU · Factory worker, Nakatsu · Parent, Oita City"
                   value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="story-quote">Your story</label>
            <textarea id="story-quote" required maxLength={1200} rows={6}
                      placeholder="How the first few months went, or the day somebody helped you out."
                      value={quote} onChange={(e) => setQuote(e.target.value)} />
          </div>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            <Icon name="send" />{busy ? 'Sending…' : 'Send to the committee'}
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
