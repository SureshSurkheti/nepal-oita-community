'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'
import { Spinner } from './Spinner'
import { useI18n } from '@/lib/useI18n'

/* On the static site this form validated, showed a success dialog, and threw
   away what was typed — there was nowhere for it to go. Now it writes to the
   messages table, which only the committee can read back. */
export function ContactForm() {
  const { t } = useI18n()
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
        <h3 className="panel__title"><Icon name="check" /> {t.contactForm.sent}</h3>
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
          <label htmlFor="c-name">{t.contactForm.name}</label>
          <input id="c-name" name="name" type="text" required autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="c-email">{t.contactForm.email} <span className="muted">({t.common.optional})</span></label>
          <input id="c-email" name="email" type="email" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="c-phone">{t.contactForm.phone} <span className="muted">({t.common.optional})</span></label>
          <input id="c-phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="field">
          <label htmlFor="c-topic">{t.contactForm.topic}</label>
          {/* The value is English on both sites and the LABEL is translated.
              Without an explicit value the option's text is what gets submitted,
              so a Nepali reader would file "सदस्य बन्ने" into the same column the
              committee reads as "Joining" — one inbox, two vocabularies, and
              nothing could group them. */}
          <select id="c-topic" name="topic" defaultValue="Joining">
            <option value="Joining">{t.contactForm.topicJoining}</option>
            <option value="An event">{t.contactForm.topicEvent}</option>
            <option value="I need help with something">{t.contactForm.topicHelp}</option>
            <option value="Volunteering">{t.contactForm.topicVolunteering}</option>
            <option value="Something else">{t.contactForm.topicOther}</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-body">{t.contactForm.message}</label>
        <textarea id="c-body" name="body" required maxLength={5000}
                  placeholder={t.contactForm.messagePlaceholder} />
      </div>
      <button className="btn btn--primary" type="submit" disabled={busy}>
        {busy ? <Spinner /> : <Icon name="send" />}{busy ? 'Sending…' : 'Send message'}
      </button>
      {error && <p className="form-note form-note--error">{error}</p>}
    </form>
  )
}
