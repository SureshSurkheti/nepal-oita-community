'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'

/* The footer newsletter box.
 *
 * On the static site this validated the address, showed a confirmation dialog,
 * and threw the address away — there was no server to keep it. Rather than
 * repeat a form that lies to the person filling it in, it files a message on
 * the committee's contact list, which is a table that already exists and that
 * only the committee can read. `name` and `body` are NOT NULL, hence the
 * filled-in values below; the address itself is what matters. */
export function NewsletterForm() {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim()
    if (!email) return

    setBusy(true)
    setError(null)
    const { error } = await createClient().from('messages').insert({
      name: 'Newsletter signup',
      email,
      topic: 'Newsletter',
      body: `Please add ${email} to the monthly newsletter.`,
    })
    setBusy(false)

    if (error) { setError('Could not save that address. Please email us instead.'); return }
    setDone(true)
  }

  if (done) {
    return (
      <p className="text-sm muted">
        You are on the list — look out for the next monthly newsletter.
      </p>
    )
  }

  return (
    <>
      <form className="newsletter" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="nl-email">Email address</label>
        <input id="nl-email" type="email" name="email" placeholder="you@example.com"
               autoComplete="email" required disabled={busy} />
        <button type="submit" aria-label="Subscribe to the newsletter" disabled={busy}>
          <Icon name="arrow-right" />
        </button>
      </form>
      {error && <p className="form-note form-note--error">{error}</p>}
    </>
  )
}
