'use client'

import { useState, useTransition } from 'react'
import { setPhone, setAdmin, removeMember, issueClaimCode, setContributor,
         type ActionResult } from '@/app/admin/members/actions'
import { AdminMemberProfile } from './AdminMemberProfile'
import { ClaimCodePanel } from './ClaimCodePanel'
import { formatJP } from '@/lib/phone'
import { Icon } from './Sprite'
import { supabaseEnv } from '@/lib/env'
import type { Member, MemberContact } from '@/lib/types'

/* Read once at module scope rather than per row. supabaseEnv() also strips the
   `/rest/v1` that the dashboard's Data API panel shows, which is what would
   otherwise be pasted into .env.local and produce a 404 for every portrait. */
const SUPABASE_URL = supabaseEnv().url

type Row = {
  member: Member
  contact: MemberContact | null
  /** Latest claim code for this member, if any has ever been issued. */
  code?: { issued_at: string; used_at: string | null } | null
}

export function AdminMemberTable({ rows, currentId }: { rows: Row[]; currentId: string }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  /* Which row has its card open. Separate from `editing` rather than one
     enum, because the two forms are different sizes and opening one while the
     other is half filled in should close it, not stack it. */
  const [carding, setCarding] = useState<string | null>(null)
  /* The code that has just been issued, and whose. Held here so it can be shown
     on that member's row instead of in the status line at the top of the page,
     which is where it used to go — off-screen, unlabelled, and mid-sentence. */
  const [issued, setIssued] = useState<{ id: string; code: string } | null>(null)

  const run = (fn: (fd: FormData) => Promise<ActionResult>) => (formData: FormData) =>
    startTransition(async () => {
      const r = await fn(formData)
      /* A result carrying a code is not a status message — it is a panel. Nothing
         goes in the status line for it, or the code appears twice in two
         different shapes. */
      if (r.ok && r.code) {
        setIssued({ id: r.memberId ?? '', code: r.code })
        setResult(null)
      } else {
        setResult(r)
        setIssued(null)
      }
      if (r.ok) setEditing(null)
    })

  /* AdminMemberProfile does its own upload before it calls the server action, so
     it reports back rather than being driven through `run`. An empty message is
     Cancel: close the form, say nothing. */
  const cardDone = (r: ActionResult) => {
    if (r.ok) setCarding(null)
    setResult(r.message ? r : null)
  }

  return (
    <div className="mt-lg">
      <h2 className="display-3 u-mb-2">Everyone on the register</h2>

      {result && (
        <p className={`form-note${result.ok ? '' : ' form-note--error'}`}>{result.message}</p>
      )}

      <ul className="roster">
        {rows.map(({ member, contact, code }) => (
          <li key={member.id}>
            {/* The portrait itself, not the initials, so "who still has no
                photograph" is answerable by looking down the page rather than by
                opening nineteen forms. */}
            <span className="avatar" aria-hidden="true">
              {member.photo_path
                /* eslint-disable-next-line @next/next/no-img-element */
                ? <img className="avatar__img" alt=""
                       src={`${SUPABASE_URL}/storage/v1/object/public/member-photos/${member.photo_path}`} />
                : (member.initials ?? member.name.charAt(0))}
            </span>
            <span>
              <span className="roster__name">
                {member.name}
                {member.is_admin
                  ? <span className="chip"> committee</span>
                  : member.can_contribute && <span className="chip"> can add</span>}
                {member.user_id === null && (
                  <span className="text-sm muted"> · not linked to an account</span>
                )}
              </span>
              <br />
              <span className="roster__meta">
                {[member.role, member.profession].filter(Boolean).join(' · ') || 'no role or profession'}
                {' · '}
                {contact?.phone_e164 ? formatJP(contact.phone_e164) : <em>no number on file</em>}
              </span>
              <br />
              {/* How this person proves who they are. Sign-in is an email address
                  and a password now, so a missing phone number no longer keeps
                  anybody out — an unredeemed code does. */}
              <span className="roster__meta">
                {member.user_id
                  ? <>signed in · code {code?.used_at ? 'redeemed' : 'not needed'}</>
                  : code && !code.used_at
                    ? <>code issued, waiting for them to use it</>
                    : <em>no code issued — they cannot claim their card yet</em>}
              </span>

              {issued?.id === member.id && (
                <ClaimCodePanel code={issued.code} name={member.name}
                                onDone={() => setIssued(null)} />
              )}

              {carding === member.id ? (
                <AdminMemberProfile member={member} onDone={cardDone} />
              ) : editing === member.id ? (
                <form className="cluster u-mt-1" action={run(setPhone)}>
                  <input type="hidden" name="member_id" value={member.id} />
                  <input name="phone" type="tel" inputMode="tel" placeholder="080 0000 0000"
                         defaultValue={contact?.phone_e164 ? formatJP(contact.phone_e164) : ''}
                         aria-label={`Mobile number for ${member.name}`} />
                  <button className="btn btn--primary" type="submit" disabled={pending}>Save</button>
                  <button className="btn btn--ghost" type="button" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <span className="roster__links">
                  <button type="button"
                          onClick={() => { setCarding(member.id); setEditing(null) }}>
                    {member.photo_path ? 'Edit their card' : 'Add a photo and details'}
                  </button>

                  <button type="button"
                          onClick={() => { setEditing(member.id); setCarding(null) }}>
                    {contact?.phone_e164 ? 'Change number' : 'Add a number'}
                  </button>

                  {!member.user_id && (
                    <form action={run(issueClaimCode)} style={{ display: 'inline' }}>
                      <input type="hidden" name="member_id" value={member.id} />
                      <button type="submit" disabled={pending} data-tone="go">
                        {code && !code.used_at ? 'Issue a new code' : 'Issue a code'}
                      </button>
                    </form>
                  )}

                  {/* Only offered for people who are not already committee —
                      is_admin implies it, so a toggle there would read as
                      switching something off that is still on. */}
                  {!member.is_admin && (
                    <form action={run(setContributor)} style={{ display: 'inline' }}>
                      <input type="hidden" name="member_id" value={member.id} />
                      <input type="hidden" name="can_contribute"
                             value={String(!member.can_contribute)} />
                      <button type="submit" disabled={pending}
                              data-tone={member.can_contribute ? 'danger' : undefined}>
                        {member.can_contribute
                          ? 'Stop them adding events'
                          : 'Let them add events'}
                      </button>
                    </form>
                  )}

                  {/* Demoting YOURSELF is the one press here with an immediate
                      consequence for the person pressing it: this page goes away
                      on the next load. The database refuses to remove the last
                      admin, so it cannot lock the committee out entirely — but it
                      can lock you out until somebody signs in as the other
                      account, and the button gave no hint of that. */}
                  <form action={run(setAdmin)} style={{ display: 'inline' }}
                        onSubmit={(e) => {
                          if (member.id === currentId && member.is_admin
                              && !window.confirm(
                                'Remove your own committee access?\n\n'
                                + 'You will lose these pages as soon as this reloads, '
                                + 'and only another committee member can give it back.')) {
                            e.preventDefault()
                          }
                        }}>
                    <input type="hidden" name="member_id" value={member.id} />
                    <input type="hidden" name="is_admin" value={String(!member.is_admin)} />
                    <button type="submit" disabled={pending}
                            data-tone={member.is_admin ? 'danger' : undefined}>
                      {member.is_admin
                        ? (member.id === currentId
                            ? 'Remove my own committee access'
                            : 'Remove committee access')
                        : 'Make committee'}
                    </button>
                  </form>

                  {member.id !== currentId && (
                    <form action={run(removeMember)} style={{ display: 'inline' }}>
                      <input type="hidden" name="member_id" value={member.id} />
                      <button type="submit" disabled={pending} data-tone="danger">Remove</button>
                    </form>
                  )}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <p className="form-note u-mt-1">
        <Icon name="users" /> <strong>Three levels.</strong> A member edits their own
        card and submits a story. <em>Let them add events</em> adds meeting write-ups
        and events — which arrive unpublished for you to check, because they cannot
        edit them afterwards. <em>Make committee</em> adds editing, deleting,
        publishing and approving, and should stay with as few people as possible.
      </p>
      <p className="form-note">
        <Icon name="shield" /> A membership code is how somebody proves they are on
        this register. Give it to them in person or by a channel you trust — it is
        the whole of the identity check. It is shown once and cannot be looked up
        again; issuing a new one stops the old one working.
      </p>
      <p className="form-note">
        <Icon name="user-plus" /> <strong>Edit their card</strong> sets the
        photograph, profession and links for somebody who cannot do it themselves —
        most of the register has never signed in, and the photographs arrive in a
        message to the committee. Anything you put there they can change later at
        My profile. Photographs are cropped square from the top, so nobody loses
        the top of their head.
      </p>
      <p className="form-note">
        Removing a member deletes their card and their contact details. Their
        sign-in account stays, but it will no longer be linked to anything.
      </p>
    </div>
  )
}
