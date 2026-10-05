'use client'

import { useEffect, useRef } from 'react'
import { Icon, type IconName } from './Sprite'

/* Shared parts for the committee's add/edit forms.
 *
 * THE THREE PROBLEMS THESE SOLVE, all measured on the event form before this
 * existed:
 *
 * 1. NINETEEN FIELDS IN ONE FLAT RUN, with no grouping of any kind. Everything
 *    looked equally important, so filling one in meant reading all of them.
 *    `AdminSection` groups them; `AdminAdvanced` hides the four that almost
 *    nobody touches (web address, colour, cost, register-by email) behind a
 *    disclosure, taking the visible count from nineteen to eleven.
 *
 * 2. PRESSING EDIT APPEARED TO DO NOTHING. The form sits above the list, so
 *    editing the eighth event opened a form a hundred lines up the page, off
 *    screen. `AdminPanel` scrolls itself into view and focuses its first field.
 *
 * 3. THE RESULT MESSAGE RENDERED AT THE TOP OF THE PAGE, a third of the way up
 *    the file, far from whatever button produced it. Same failure as the claim
 *    code: feedback nobody sees is feedback that did not happen. `AdminActions`
 *    keeps Save, Cancel and the message together at the foot of the form, and
 *    sticks them to the bottom of the viewport so Save is always reachable
 *    without scrolling a long form to its end.
 */

export function AdminPanel({ title, icon = 'check', children }: {
  title: React.ReactNode
  icon?: IconName
  children: React.ReactNode
}) {
  const ref = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    /* `block: 'start'` with a nudge rather than 'center': a long form centred
       puts its own heading above the fold, so you land in the middle of fields
       with no idea what you are editing. */
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    /* Focus the first real control so a keyboard user carries on typing, but
       NOT on a touch screen — focusing an input there throws the keyboard up
       over the form the moment it opens. */
    if (!window.matchMedia('(pointer: coarse)').matches) {
      const first = el.querySelector<HTMLElement>(
        'input:not([type=hidden]):not([type=file]), select, textarea',
      )
      first?.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div className="adminform__wrap" ref={(n) => { ref.current = n?.querySelector('form') ?? null }}>
      {children}
    </div>
  )
}

/** A labelled group of fields. */
export function AdminSection({ title, hint, children }: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="adminsec">
      <h3 className="adminsec__title">{title}</h3>
      {hint && <p className="adminsec__hint">{hint}</p>}
      {children}
    </section>
  )
}

/* The fields that have a sensible default and are rarely changed. A <details>
   rather than React state: it keeps its own open/closed, works before hydration,
   and the browser opens it automatically when a validation error or an in-page
   find lands on something inside it — which a div toggled by useState does not. */
export function AdminAdvanced({ children, label = 'More options' }: {
  children: React.ReactNode
  label?: string
}) {
  return (
    <details className="adminadv">
      <summary className="adminadv__summary">
        <Icon name="chevron-down" /> {label}
        <span className="muted"> — sensible defaults are already filled in</span>
      </summary>
      <div className="adminadv__body">{children}</div>
    </details>
  )
}

/** Save/Cancel plus the result message, stuck to the foot of the form. */
export function AdminActions({ busy, saveLabel = 'Save', busyLabel = 'Saving…',
                              onCancel, message }: {
  busy: boolean
  saveLabel?: string
  busyLabel?: string
  onCancel: () => void
  message?: { ok: boolean; text: string } | null
}) {
  return (
    <div className="adminbar">
      {message && message.text && (
        <p className={`adminbar__msg${message.ok ? '' : ' adminbar__msg--error'}`}
           role="status" aria-live="polite">
          <Icon name={message.ok ? 'check' : 'close'} />{message.text}
        </p>
      )}
      <div className="adminbar__row">
        <button className="btn btn--primary" type="submit" disabled={busy}>
          <Icon name="check" />{busy ? busyLabel : saveLabel}
        </button>
        <button className="btn btn--ghost" type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  )
}
