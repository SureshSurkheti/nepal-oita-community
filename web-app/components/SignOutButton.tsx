'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'

export function SignOutButton() {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <button
      className="btn btn--ghost nav__signout"
      type="button"
      disabled={busy}
      aria-label="Sign out"
      title="Sign out"
      onClick={async () => {
        setBusy(true)
        setFailed(false)
        const { error } = await createClient().auth.signOut()

        if (error) {
          /* Say so rather than sitting on "Signing out…" for ever. A button that
             claims to be working and never finishes is the thing that sent
             somebody to ask why the header was stuck. */
          setBusy(false)
          setFailed(true)
          return
        }

        /* A full page load, not router.refresh() + router.push().
           
           That pair left the header showing "My profile" and a permanent
           "Signing out…" — the refresh raced the push, and the button's own
           `busy` state outlived whichever won, because the component was never
           unmounted. Nothing about client-side navigation can be relied on to
           discard a tree that was rendered against a session which no longer
           exists, and leaving a signed-out member looking at another member's
           phone number is not a risk worth taking for one saved round trip. */
        window.location.assign('/')
      }}
    >
      <Icon name="log-out" />
      <span className="nav__label">
        {failed ? 'Sign out failed — retry' : busy ? 'Signing out…' : 'Sign out'}
      </span>
    </button>
  )
}
