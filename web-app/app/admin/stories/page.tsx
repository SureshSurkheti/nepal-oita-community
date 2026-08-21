import type { Metadata } from 'next'
import { requireAdmin, friendlyError } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Icon } from '@/components/Sprite'
import { AdminActionList, type ActionItem } from '@/components/AdminActionList'

export const metadata: Metadata = { title: 'Committee — stories', robots: { index: false } }

type Story = {
  id: string; author_name: string; author_role: string | null
  quote: string; status: 'pending' | 'approved' | 'rejected'; created_at: string
}

async function setStatus(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_set_story_status', {
    p_id: String(formData.get('id') ?? ''),
    p_status: String(formData.get('status') ?? 'pending'),
  })
  revalidatePath('/admin/stories'); revalidatePath('/stories'); revalidatePath('/')
  return error
    ? { ok: false, message: friendlyError(error.message) }
    : { ok: true, message: `Story marked ${formData.get('status')}.` }
}

async function remove(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_delete_story', { p_id: String(formData.get('id') ?? '') })
  revalidatePath('/admin/stories'); revalidatePath('/stories'); revalidatePath('/')
  return error ? { ok: false, message: friendlyError(error.message) } : { ok: true, message: 'Story deleted.' }
}

export default async function AdminStoriesPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data } = await supabase.from('stories').select('*')
    .order('status').order('sort_order').order('created_at', { ascending: false })
  const stories = (data ?? []) as Story[]
  const pending = stories.filter((s) => s.status === 'pending')

  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">
            <span className="eyebrow__badge"><Icon name="shield" /></span>
            Committee only
          </p>
          <h1 className="display-2">Community stories</h1>
          <p className="lede">
            Members can submit their own. Nothing appears on the site until it is
            approved here — a member cannot publish their own words, by design.
          </p>
        </div>

        {pending.length > 0 && (
          <div className="panel panel--ink reveal u-mb-2">
            <h2 className="panel__title"><Icon name="send" /> {pending.length} waiting for you</h2>
            <p>Read them below and approve or reject.</p>
          </div>
        )}

        <AdminActionList
          items={stories.map((s): ActionItem => ({
            id: s.id,
            initial: s.author_name.charAt(0),
            title: s.author_name,
            badge: s.status === 'approved' ? null : s.status,
            meta: s.author_role ?? '',
            body: s.quote,
            actions: [
              ...(s.status !== 'approved'
                ? [{ label: 'Approve', fields: { id: s.id, status: 'approved' }, action: 'status' as const }] : []),
              ...(s.status !== 'rejected'
                ? [{ label: 'Reject', fields: { id: s.id, status: 'rejected' }, action: 'status' as const }] : []),
              { label: 'Delete', fields: { id: s.id }, action: 'remove' as const },
            ],
          }))}
          onStatus={setStatus}
          onRemove={remove}
          empty="No stories yet."
        />
      </div>
    </section>
  )
}
