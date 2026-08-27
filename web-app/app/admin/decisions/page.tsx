import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { requireAdmin, friendlyError } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { Icon } from '@/components/Sprite'
import { AdminActionList, type ActionItem } from '@/components/AdminActionList'
import { longDate } from '@/lib/content'

/* Depends on who is asking, so it can never be cached or prerendered.
   This used to be inherited from the root layout's force-dynamic; the layout
   dropped it so the public pages could be served from a CDN, which means the
   viewer-specific routes have to declare it themselves. Reading cookies would
   make it dynamic anyway — saying so explicitly stops a build trying to
   prerender it, and stops a future edit quietly making it cacheable. */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Committee — decisions', robots: { index: false } }

type Row = {
  id: string; held_on: string; title: string; summary: string | null
  place: string | null; status: 'pending' | 'approved' | 'rejected'
}

async function setStatus(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_set_meeting_status', {
    p_id: String(formData.get('id') ?? ''),
    p_status: String(formData.get('status') ?? 'pending'),
  })
  revalidatePath('/admin/decisions'); revalidatePath('/decisions'); revalidatePath('/')
  const status = String(formData.get('status') ?? '')
  return error
    ? { ok: false, message: friendlyError(error.message) }
    : { ok: true, message: status === 'approved' ? 'Back up on the site.' : 'Taken down.' }
}

async function remove(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_delete_meeting', {
    p_id: String(formData.get('id') ?? ''),
  })
  revalidatePath('/admin/decisions'); revalidatePath('/decisions'); revalidatePath('/')
  return error
    ? { ok: false, message: friendlyError(error.message) }
    : { ok: true, message: 'Write-up deleted, decisions and all.' }
}

export default async function AdminDecisionsPage() {
  await requireAdmin()
  const supabase = await createClient()

  const [{ data: meetings }, { data: points }] = await Promise.all([
    supabase.from('meetings').select('*').order('status').order('held_on', { ascending: false }),
    supabase.from('meeting_points').select('*').order('position'),
  ])

  const rows = (meetings ?? []) as Row[]
  const byMeeting = new Map<string, string[]>()
  for (const p of ((points ?? []) as { meeting_id: string; text: string }[])) {
    byMeeting.set(p.meeting_id, [...(byMeeting.get(p.meeting_id) ?? []), p.text])
  }
  // Anything not approved is off the site. 'pending' is now only reachable by a
  // committee member putting something back into review by hand, so the two
  // non-live states are counted together rather than treated as a queue.
  const down = rows.filter((r) => r.status !== 'approved')

  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">
            <span className="eyebrow__badge"><Icon name="shield" /></span>
            Committee only
          </p>
          <h1 className="display-2">Meeting decisions</h1>
          <p className="lede">
            The leadership team writes these up and they go straight on to the
            site — since <code>0015</code> nothing queues here for approval. What
            is left is the lever: take a write-up down if it is wrong, and put it
            back when it is fixed. Nobody but the committee can do either.
          </p>
        </div>

        {down.length > 0 && (
          <div className="panel panel--ink reveal u-mb-2">
            <h2 className="panel__title">
              <Icon name="shield" /> {down.length} off the site
            </h2>
            <p>
              These are not public. The leadership team can still see and correct
              them on <code>/decisions</code>, but only you can put one back up.
            </p>
          </div>
        )}

        <AdminActionList
          items={rows.map((r): ActionItem => ({
            id: r.id,
            initial: String(new Date(`${r.held_on}T12:00:00Z`).getUTCDate()),
            title: r.title,
            badge: r.status === 'approved' ? null : 'off the site',
            meta: [longDate(r.held_on), r.place, r.summary].filter(Boolean).join(' · '),
            // The decisions themselves, which are the thing being checked.
            body: (byMeeting.get(r.id) ?? []).map((t) => `• ${t}`).join('  '),
            actions: [
              /* "Put back up" and "Take down", not "Approve" and "Reject":
                 approval is not a step any of these went through, and calling it
                 that invites somebody to believe the ones with no badge are
                 waiting for them. */
              ...(r.status !== 'approved'
                ? [{ label: 'Put back up', fields: { id: r.id, status: 'approved' }, action: 'status' as const }] : []),
              ...(r.status === 'approved'
                ? [{ label: 'Take down', fields: { id: r.id, status: 'rejected' }, action: 'status' as const }] : []),
              { label: 'Delete', fields: { id: r.id }, action: 'remove' as const },
            ],
          }))}
          onStatus={setStatus}
          onRemove={remove}
          empty="No meetings written up yet."
        />
      </div>
    </section>
  )
}
