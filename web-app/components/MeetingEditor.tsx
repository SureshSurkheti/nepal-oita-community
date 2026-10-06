'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'
import { Spinner } from './Spinner'
import { MeetingForm, type MeetingDraft } from './MeetingForm'

/* Edit and Delete on one write-up, for the leadership team.
 *
 * Rendered under each entry on /decisions rather than only on the committee
 * page: the officer correcting a decision is reading the decision, and making
 * them find the same entry again inside an admin list is how a typo survives for
 * a month.
 *
 * Delete confirms in place instead of with window.confirm(). A native dialog is
 * unstyled, easy to dismiss by reflex, and gives no room to say what is actually
 * about to happen — and what is about to happen here is a meeting and all of its
 * decisions, with no undo.
 *
 * WHY DELETE IS OPTIONAL
 * On the home page the card carries Edit and nothing else. The front page is a
 * reading surface — people arrive at it to see what was decided, not to manage
 * the archive — and a control with no undo does not belong one mis-tap away from
 * the thing everybody looks at first. Correcting a typo is the common job and
 * stays where it is useful; removing a whole meeting is a deliberate act, so it
 * lives on /decisions, which is a page you have chosen to open.
 */
export function MeetingEditor({ draft, allowDelete = true }: {
  draft: MeetingDraft
  /** False on the home page. See the note above. */
  allowDelete?: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'edit' | 'confirm'>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [raw, setRaw] = useState<MeetingDraft | null>(null)

  /* THE FORM IS LOADED FROM THE DATABASE, NOT FROM THE CARD IT SITS UNDER, and
   * that is a correctness fix rather than a nicety.
   *
   * `draft` comes from getMeetings(), which RESOLVES each field to the language
   * of the page — the Nepali title on /ne when there is one. Handing that back
   * to the form would make Save write the Nepali into the English column, so
   * editing a typo on the Nepali page would quietly destroy the English
   * version of the same meeting. There is nothing on screen that would show it.
   *
   * So pressing Edit fetches the row as it is actually stored, both languages
   * side by side. The card keeps showing the translated text, which is right:
   * it is what the page is for. */
  useEffect(() => {
    if (mode !== 'edit' || raw) return
    let live = true
    const supabase = createClient()

    Promise.all([
      supabase.from('meetings').select('*').eq('id', draft.id).single(),
      supabase.from('meeting_points').select('*').eq('meeting_id', draft.id).order('position'),
    ]).then(([m, pts]) => {
      if (!live) return
      if (m.error || !m.data) {
        setError(`Could not open that for editing. ${m.error?.message ?? ''}`)
        setMode('idle')
        return
      }
      const row = m.data as Record<string, unknown>
      setRaw({
        id: draft.id,
        held_on: row.held_on as string,
        title: row.title as string,
        title_ne: (row.title_ne as string | null) ?? null,
        place: (row.place as string | null) ?? null,
        summary: (row.summary as string | null) ?? null,
        summary_ne: (row.summary_ne as string | null) ?? null,
        points: ((pts.data ?? []) as { text: string; text_ne: string | null }[])
          .map((x) => ({ text: x.text, text_ne: x.text_ne ?? null })),
      })
    })
    return () => { live = false }
  }, [mode, raw, draft.id])

  async function remove() {
    setBusy(true)
    setError(null)
    /* The points go with it: meeting_points.meeting_id is ON DELETE CASCADE, so
       there is no second statement to get half-way through. */
    const { error: e } = await createClient().from('meetings').delete().eq('id', draft.id)
    setBusy(false)
    if (e) { setError(`Could not delete it. ${e.message}`); return }
    router.refresh()
  }

  if (mode === 'edit') {
    /* Nothing rendered until the stored row is in hand. A form pre-filled with
       the translated text for even one frame is a form somebody can submit. */
    if (!raw) return <p className="muted">Opening…</p>
    return (
      <MeetingForm memberId={null} canContribute draft={raw}
                   onDone={() => { setRaw(null); setMode('idle') }} />
    )
  }

  return (
    <div className="minute-tools">
      {mode === 'confirm' ? (
        <>
          <p className="minute-tools__warn">
            Delete &ldquo;{draft.title}&rdquo; and its {draft.points.length} decision
            {draft.points.length === 1 ? '' : 's'}? This cannot be undone.
          </p>
          <div className="cluster">
            <button className="btn btn--sm btn--danger" type="button" disabled={busy}
                    onClick={remove}>
              {busy ? <Spinner /> : <Icon name="close" />}{busy ? 'Deleting…' : 'Yes, delete it'}
            </button>
            <button className="btn btn--sm btn--ghost" type="button" disabled={busy}
                    onClick={() => setMode('idle')}>
              Keep it
            </button>
          </div>
        </>
      ) : (
        <div className="cluster">
          <button className="btn btn--sm btn--ghost" type="button"
                  onClick={() => setMode('edit')}>
            <Icon name="send" /> Edit
          </button>
          {allowDelete && (
            <button className="btn btn--sm btn--ghost" type="button"
                    onClick={() => setMode('confirm')}>
              <Icon name="close" /> Delete
            </button>
          )}
        </div>
      )}
      {error && <p className="form-note form-note--error">{error}</p>}
    </div>
  )
}
