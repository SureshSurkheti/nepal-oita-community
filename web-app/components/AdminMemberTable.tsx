'use client'

import { useState, useTransition } from 'react'
import { setPhone, setAdmin, removeMember, issueClaimCode, setContributor,
         type ActionResult } from '@/app/admin/members/actions'
import { formatJP } from '@/lib/phone'
import { Icon } from './Sprite'
import type { Member, MemberContact } from '@/lib/types'

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

  const run = (fn: (fd: FormData) => Promise<ActionResult>) => (formData: FormData) =>
    startTransition(async () => {
      const r = await fn(formData)
      setResult(r)
      if (r.ok) setEditing(null)
    })

  return (
    <div className="mt-lg">
      <h2 className="display-3 u-mb-2">Everyone on the register</h2>

      {result && (
        <p className={`form-note${result.ok ? '' : ' form-note--error'}`}>{result.message}</p>
      )}

      <ul className="roster">
        {rows.map(({ member, contact, code }) => (
          <li key={member.id}>
            <span className="avatar" aria-hidden="true">{member.initials ?? member.name.charAt(0)}</span>
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

              {editing === member.id ? (
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
                  <button type="button" onClick={() => setEditing(member.id)}>
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
        Removing a member deletes their card and their contact details. Their
        sign-in account stays, but it will no longer be linked to anything.
      </p>
    </div>
  )
}
