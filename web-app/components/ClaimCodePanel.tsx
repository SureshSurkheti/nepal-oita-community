'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from './Sprite'

/* A freshly issued membership code, shown on the row it belongs to.
 *
 * WHY THIS COMPONENT EXISTS
 * The code used to be a sentence in a status line at the top of the page:
 * "Code for this member: 8HZBB-JS87Q — write it down now…". Three things were
 * wrong with that, and all three cost somebody a code:
 *
 *   1. It appeared ABOVE the whole register. Press the button on the fifteenth
 *      row and the only output is off the top of the screen.
 *   2. It said "this member" and never whose. With nineteen rows that is not a
 *      rhetorical question.
 *   3. The code was ten characters of prose in a paragraph of prose, so it was
 *      read as part of the sentence rather than as the thing to copy. Somebody
 *      typed the member's NAME into the sign-in box instead.
 *
 * The code cannot be looked up again — only the hash is stored — so losing it
 * means issuing another and finding the person again. That makes this worth a
 * component rather than a better sentence.
 *
 * It does not auto-dismiss. Somebody is copying this onto paper or into a
 * message; a panel that vanished on a timer would be the same bug again. */
export function ClaimCodePanel({ code, name, onDone }: {
  code: string
  name: string
  onDone: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  /* Bring it into view. It renders on the right row, but that row can still be
     below the fold if the committee pressed the button and then scrolled. */
  useEffect(() => {
    box.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])

  async function copy() {
    setFailed(false)
    try {
      /* Only available over https and on localhost. Vercel is https so this is
         the normal path, but a plain-http preview would throw — and throwing
         silently would look like the button doing nothing. */
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      /* Select it instead, so ⌘C still works. Better than an error nobody can
         act on: the code is right there and now it is highlighted. */
      setFailed(true)
      const el = document.getElementById(`code-${code}`)
      if (el) {
        const r = document.createRange()
        r.selectNodeContents(el)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(r)
      }
    }
  }

  return (
    <div className="codeout" ref={box}>
      <p className="codeout__who">
        <Icon name="shield" /> Membership code for <strong>{name}</strong>
      </p>

      <div className="codeout__row">
        {/* A <code> rather than an input: an input invites editing something that
            cannot be edited, and a read-only input reads as broken. */}
        <code className="codeout__code" id={`code-${code}`}>{code}</code>
        <button className={`btn btn--sm ${copied ? 'btn--ok' : 'btn--primary'}`}
                type="button" onClick={copy}>
          <Icon name={copied ? 'check' : 'copy'} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <p className="codeout__warn">
        <strong>Write it down or send it now.</strong> Only a one-way hash of this
        is stored, so it cannot be shown again — if it is lost, issue another.
        Any code {name.split(' ')[0]} had before this one has stopped working.
      </p>

      {failed && (
        <p className="codeout__warn">
          The clipboard is not available here, so the code has been selected
          instead — press ⌘C or Ctrl+C.
        </p>
      )}

      <p className="codeout__next">
        Give it to them with: <em>go to Sign in → Make an account, then type this
        code.</em> Case, spaces and the dash do not matter.
      </p>

      <button className="btn btn--sm btn--ghost" type="button" onClick={onDone}>
        I have written it down
      </button>
    </div>
  )
}
