import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { requireAdmin, friendlyError } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { Icon } from '@/components/Sprite'
import { AdminActionList, type ActionItem } from '@/components/AdminActionList'
import { longDate } from '@/lib/content'

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
  return error
    ? { ok: false, message: friendlyError(error.message) }
    : { ok: true, message: `Write-up marked ${formData.get('status')}.` }
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
  const pending = rows.filter((r) => r.status === 'pending')

  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">Committee only</p>
          <h1 className="display-2">Meeting decisions</h1>
          <p className="lede">
            Members write these up. Read them against what was actually agreed
            before approving — once approved, this is the record.
          </p>
        </div>

        {pending.length > 0 && (
          <div className="panel panel--ink reveal u-mb-2">
            <h2 className="panel__title">
              <Icon name="clock" /> {pending.length} waiting for you
            </h2>
            <p>Nothing below appears on the site until it is approved.</p>
          </div>
        )}

        <AdminActionList
          items={rows.map((r): ActionItem => ({
            id: r.id,
            initial: String(new Date(`${r.held_on}T12:00:00Z`).getUTCDate()),
            title: r.title,
            badge: r.status === 'approved' ? null : r.status,
            meta: [longDate(r.held_on), r.place, r.summary].filter(Boolean).join(' · '),
            // The decisions themselves, which are the thing being checked.
            body: (byMeeting.get(r.id) ?? []).map((t) => `• ${t}`).join('  '),
            actions: [
              ...(r.status !== 'approved'
                ? [{ label: 'Approve', fields: { id: r.id, status: 'approved' }, action: 'status' as const }] : []),
              ...(r.status !== 'rejected'
                ? [{ label: 'Reject', fields: { id: r.id, status: 'rejected' }, action: 'status' as const }] : []),
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
