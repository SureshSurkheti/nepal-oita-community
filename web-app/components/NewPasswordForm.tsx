'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/useI18n'
import { Icon } from './Sprite'

/* Choosing a new password, after a recovery link has been exchanged for a
 * session by app/[lang]/auth/callback.
 *
 * THE SESSION IS CHECKED BEFORE THE FORM IS OFFERED. updateUser() acts on
 * whoever is signed in, so without a check this page would show a working form
 * to somebody with no session — they would type a new password, press the
 * button, and be told to sign in, which is the one thing they cannot do. Worse,
 * a member who happened to be signed in already and wandered onto this URL would
 * change their password without having asked to.
 *
 * So there are three states and they are all different: waiting on the session
 * lookup, no session at all (say so, and offer the only useful door), and ready.
 */
export function NewPasswordForm() {
  const { t, locale } = useI18n()
  const [ready, setReady] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let live = true
    supabase.auth.getUser().then(({ data }) => {
      if (live) setReady(data.user !== null)
    })
    /* The callback route sets the cookies and redirects, so by the time this
       mounts the session is normally already there. This listener covers the
       other order — Supabase can also deliver a recovery session to the client
       directly — and costs nothing when it never fires. */
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (live && session) setReady(true)
    })
    return () => { live = false; sub.subscription.unsubscribe() }
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) { setError(t.auth.passwordTooShort); return }
    /* Typed twice, because there is nothing to compare against. On sign-in a
       typo is caught immediately by the password being wrong; here a typo is
       stored and the member is locked out of their own account by the form that
       was supposed to let them back in. */
    if (password !== again) { setError(t.auth.passwordsDiffer); return }

    setBusy(true)
    const { error: err } = await createClient().auth.updateUser({ password })
    setBusy(false)

    if (err) { setError(err.message); return }
    setDone(true)
  }

  if (ready === null) return <p className="muted">{t.auth.checking}</p>

  if (!ready) {
    return (
      <div className="panel">
        <p>{t.auth.resetLinkDead}</p>
        <a className="btn btn--primary u-mt-1" href={`/${locale}/sign-in`}>
          <Icon name="shield" /> {t.auth.backToSignIn}
        </a>
      </div>
    )
  }

  if (done) {
    return (
      <div className="panel">
        <p className="form-note">{t.auth.passwordChanged}</p>
        {/* A full load, not a router push: every page on this site is rendered
            against the session, so the whole tree has to be fetched again. */}
        <a className="btn btn--primary u-mt-1" href={`/${locale}/me`}>
          <Icon name="user" /> {t.nav.profile}
        </a>
      </div>
    )
  }

  return (
    <form className="panel" onSubmit={submit}>
      {error && <p className="form-note form-note--error">{error}</p>}

      <label htmlFor="np-password">{t.auth.newPassword}</label>
      <input id="np-password" type="password" value={password} autoComplete="new-password"
             onChange={(e) => setPassword(e.target.value)} required minLength={8} />

      <label htmlFor="np-again" className="u-mt-1">{t.auth.newPasswordAgain}</label>
      <input id="np-again" type="password" value={again} autoComplete="new-password"
             onChange={(e) => setAgain(e.target.value)} required minLength={8} />

      <button className="btn btn--primary u-mt-1" type="submit" disabled={busy}>
        {busy ? t.auth.working : t.auth.savePassword}
      </button>
    </form>
  )
}
