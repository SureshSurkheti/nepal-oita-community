'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'
import { Spinner } from './Spinner'
import { useI18n } from '@/lib/useI18n'

type Mode = 'in' | 'up'

/* Member sign-in: an email address and a password for the ACCOUNT, and a
 * one-time code from the committee for the MEMBERSHIP.
 *
 * The two are deliberately separate, and the separation is the whole design.
 * Anybody can make an account — it proves only that they typed an email
 * address, and it buys them exactly what a stranger already had: the public
 * pages. What opens the register is the code, which the committee hands over in
 * person to somebody they recognise. That is the verification step, it costs
 * nothing, and it is the reason none of this needs SMS.
 *
 * It also means the email address does not have to be confirmed to be useful,
 * which matters: Supabase's built-in mailer is rate-limited to a handful an hour
 * and is not meant for production. A member who could not receive a
 * confirmation link would be locked out by a mail server, not by a policy.
 *
 * This replaced phone OTP, which worked but needed a paid SMS account.
 */
export function SignInForm({ hasAccount = false, hasMemberCard = false }: {
  hasAccount?: boolean
  hasMemberCard?: boolean
}) {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState(hasAccount)

  /* Step one: get a session. */
  async function account(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!email.trim()) { setError('Your email address, please.'); return }
    if (password.length < 8) {
      setError('Eight characters or more, so it is worth having.')
      return
    }

    setBusy(true)
    const supabase = createClient()
    const { data, error: authError } = mode === 'up'
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)

    if (authError) {
      const raw = authError.message.toLowerCase()
      if (raw.includes('already registered') || raw.includes('already exists')) {
        setError('There is already an account on that address. Sign in instead.')
        setMode('in')
      } else if (raw.includes('invalid login')) {
        setError('That email and password do not match an account.')
      } else if (raw.includes('signups not allowed') || raw.includes('disabled')) {
        setError(
          'New accounts are switched off for this project. In the Supabase '
          + 'dashboard: Authentication → Sign In / Providers → Email.',
        )
      } else {
        setError(authError.message)
      }
      return
    }

    /* No session after signUp means the project still requires a confirmation
       email. Say which setting, because the alternative — waiting for a message
       that is rate-limited to two an hour — looks like the form is broken. */
    if (!data.session) {
      setError(
        'Account made, but this project asks for the email to be confirmed before '
        + 'signing in. Either check for that email, or turn off "Confirm email" '
        + 'in Authentication → Sign In / Providers → Email. The code below is what '
        + 'proves membership, so confirming the address is not what keeps this safe.',
      )
      return
    }

    setSignedIn(true)
  }

  /* Step two: prove membership. */
  async function claim(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    setBusy(true)
    const { data, error: rpcError } = await createClient()
      .rpc('claim_member_with_code', { p_code: code })
    setBusy(false)

    // The function's own messages are written for the person reading them and
    // say what to do next, so they are shown as they come.
    if (rpcError) { setError(rpcError.message); return }
    if (!data) { setError('That code did not match a member card.'); return }

    // A full load, not router.push: every page is rendered against the session
    // and the whole tree has to be re-fetched now that this account has a card.
    window.location.assign('/members')
  }

  if (hasMemberCard) {
    return (
      <div className="gate-panel panel reveal">
        <h1 className="panel__title"><Icon name="check" /> {t.auth.youAreSignedIn}</h1>
        <p className="u-mb-15">{t.auth.linkedToCard}</p>
        <a className="btn btn--primary" href="/me"><Icon name="user-plus" /> {t.nav.myProfile}</a>
      </div>
    )
  }

  return (
    <div className="gate-panel panel reveal">
      <h1 className="panel__title"><Icon name="shield" /> {t.auth.memberSignIn}</h1>

      {!signedIn ? (
        <>
          <p className="u-mb-15">
            {mode === 'in'
              ? t.auth.signInIntro
              : t.auth.signUpIntro}
          </p>
          <form className="gate gate--tight" onSubmit={account}>
            <div className="field">
              <label htmlFor="si-email">{t.auth.email}</label>
              <input id="si-email" type="email" required autoComplete="email"
                     placeholder={t.ui.emailPlaceholder}
                     value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="si-password">{t.auth.password}</label>
              <input id="si-password" type="password" required
                     autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
                     value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? <Spinner /> : <Icon name="shield" />}
              {busy ? t.auth.working : mode === 'in' ? t.nav.signIn : t.auth.makeMyAccount}
            </button>
            {error && <p className="form-note form-note--error">{error}</p>}
          </form>
          <p className="form-note">
            {mode === 'in' ? `${t.auth.firstTime} ` : `${t.auth.haveAccount} `}
            <button className="link-button" type="button"
                    onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(null) }}>
              {mode === 'in' ? t.auth.makeAccount : t.auth.signInInstead}
            </button>
          </p>
        </>
      ) : (
        <>
          <p className="u-mb-15">
            {t.auth.codeIntro}
          </p>
          <form className="gate gate--tight" onSubmit={claim}>
            <div className="field">
              <label htmlFor="si-code">{t.auth.membershipCode}</label>
              <input id="si-code" type="text" required autoComplete="off"
                     spellCheck={false} placeholder="ABCDE-FGHJK" maxLength={16}
                     value={code}
                     onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? <Spinner /> : <Icon name="check" />}{busy ? t.auth.checking : t.auth.linkMembership}
            </button>
            {error && <p className="form-note form-note--error">{error}</p>}
          </form>
          <p className="form-note">
            {t.auth.noCodeLead}{' '}
            <a href="mailto:nepaloitacommunity11@gmail.com">{t.auth.theCommittee}</a>{' '}
            {t.auth.noCodeTail}
          </p>
          {/* A way back out. Signing up with a typo in the address used to leave
              you here with no exit: the header shows no Sign out until an account
              has a member card, which is exactly what this step is for. */}
          <p className="form-note">
            {t.auth.wrongAccount}{' '}
            <button className="link-button" type="button" onClick={async () => {
              await createClient().auth.signOut()
              window.location.assign('/sign-in')
            }}>
              {t.auth.signOutStartAgain}
            </button>
          </p>
        </>
      )}
    </div>
  )
}
