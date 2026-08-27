'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DEV_SIGNIN_CODE, type DevMemberChoice } from '@/lib/devSignIn'
import { Icon } from './Sprite'
import { Spinner } from './Spinner'

/* The development sign-in panel. Only ever rendered when both locks in
   lib/devSignIn.ts are open — see the comment there before changing anything.

   It gets a real session in two steps: signInAnonymously() for the session, then
   dev_sign_in_as() to attach a member card to it. Neither step weakens a policy;
   the second simply skips the part where you prove who you are. */
export function DevSignIn() {
  const router = useRouter()
  const [choices, setChoices] = useState<DevMemberChoice[] | null>(null)
  const [slug, setSlug] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notInstalled, setNotInstalled] = useState(false)

  useEffect(() => {
    let live = true
    createClient().rpc('dev_member_choices').then(({ data, error }) => {
      if (!live) return
      // A missing function is the expected failure here, not an exception: it
      // means the SQL has not been run yet, which is worth saying precisely.
      if (error) { setNotInstalled(true); return }
      setChoices((data ?? []) as DevMemberChoice[])
    })
    return () => { live = false }
  }, [])

  async function signIn(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (code.replace(/\D/g, '') !== DEV_SIGNIN_CODE) {
      setError(`The development code is ${DEV_SIGNIN_CODE}.`)
      return
    }

    setBusy(true)
    const supabase = createClient()

    const { error: sessionError } = await supabase.auth.signInAnonymously()
    if (sessionError) {
      setBusy(false)
      setError(
        'Could not start a session. Anonymous sign-ins are switched off for this '
        + 'project: Supabase dashboard → Authentication → Sign In / Providers → '
        + `Anonymous sign-ins. (${sessionError.message})`,
      )
      return
    }

    const { data, error: claimError } = await supabase.rpc('dev_sign_in_as', {
      p_slug: slug || null,
    })
    setBusy(false)

    if (claimError) {
      // These messages are written for whoever is reading them and name the
      // thing to go and fix, so they are shown as they come.
      setError(claimError.message)
      return
    }

    const row = Array.isArray(data) ? data[0] : data
    router.refresh()
    router.push(row?.is_committee ? '/admin' : '/members')
  }

  if (notInstalled) {
    return (
      <div className="panel u-mt-2">
        <h2 className="panel__title"><Icon name="shield" /> Development sign-in</h2>
        <p className="text-sm">
          Not installed yet. In the Supabase SQL editor, run{' '}
          <code>web-app/supabase/dev/dev_signin.sql</code> — its header lists the
          one dashboard toggle it needs.
        </p>
      </div>
    )
  }

  return (
    <div className="panel u-mt-2">
      <h2 className="panel__title"><Icon name="shield" /> Development sign-in</h2>
      <p className="text-sm u-mb-15">
        Because SMS is not connected yet. Anyone can use this, so it must be
        removed before the site is published — <code>dev_signin_remove.sql</code>.
      </p>

      <form className="gate" onSubmit={signIn}>
        <div className="field">
          <label htmlFor="dev-who">Sign in as</label>
          <select id="dev-who" value={slug} onChange={(e) => setSlug(e.target.value)}>
            <option value="">The committee (default)</option>
            {(choices ?? []).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}{c.role ? ` — ${c.role}` : ''}{c.is_admin ? ' · committee' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="dev-code">Code</label>
          <input id="dev-code" type="text" inputMode="numeric" maxLength={6}
                 placeholder={DEV_SIGNIN_CODE} autoComplete="off"
                 value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? <Spinner /> : <Icon name="check" />}{busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <p className="form-note form-note--error">{error}</p>}
      </form>
    </div>
  )
}
