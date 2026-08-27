'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'
import { Spinner } from './Spinner'

/* On the static site this form validated, showed a success dialog, and threw
   away what was typed — there was nowhere for it to go. Now it writes to the
   messages table, which only the committee can read back. */
export function ContactForm() {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)

    const name = String(form.get('name') ?? '').trim()
    const body = String(form.get('body') ?? '').trim()
    if (!name || !body) { setError('Please give your name and a message.'); return }

    setBusy(true)
    const { error } = await createClient().from('messages').insert({
      name,
      email: String(form.get('email') ?? '').trim() || null,
      phone: String(form.get('phone') ?? '').trim() || null,
      topic: String(form.get('topic') ?? '').trim() || null,
      body,
    })
    setBusy(false)

    if (error) { setError(`Could not send that. ${error.message}`); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="panel">
        <h3 className="panel__title"><Icon name="check" /> Message sent</h3>
        <p>
          Thank you — somebody on the committee will read it. If it is urgent,
          call <a href="tel:+818043164111">080 4316 4111</a>.
        </p>
      </div>
    )
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="c-name">Your name</label>
          <input id="c-name" name="name" type="text" required autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="c-email">Email <span className="muted">(optional)</span></label>
          <input id="c-email" name="email" type="email" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="c-phone">Phone <span className="muted">(optional)</span></label>
          <input id="c-phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="field">
          <label htmlFor="c-topic">What is it about</label>
          <select id="c-topic" name="topic" defaultValue="Joining">
            <option>Joining</option>
            <option>An event</option>
            <option>I need help with something</option>
            <option>Volunteering</option>
            <option>Something else</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-body">Your message</label>
        <textarea id="c-body" name="body" required maxLength={5000}
                  placeholder="Tell us what you need — in English, Nepali or Japanese." />
      </div>
      <button className="btn btn--primary" type="submit" disabled={busy}>
        {busy ? <Spinner /> : <Icon name="send" />}{busy ? 'Sending…' : 'Send message'}
      </button>
      {error && <p className="form-note form-note--error">{error}</p>}
    </form>
  )
}
