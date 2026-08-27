import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { requireAdmin, friendlyError } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { AdminActionList, type ActionItem } from '@/components/AdminActionList'
import { Icon } from '@/components/Sprite'

/* Depends on who is asking, so it can never be cached or prerendered.
   This used to be inherited from the root layout's force-dynamic; the layout
   dropped it so the public pages could be served from a CDN, which means the
   viewer-specific routes have to declare it themselves. Reading cookies would
   make it dynamic anyway — saying so explicitly stops a build trying to
   prerender it, and stops a future edit quietly making it cacheable. */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Committee — messages', robots: { index: false } }

type Message = {
  id: string; name: string; email: string | null; phone: string | null
  topic: string | null; body: string; handled: boolean; created_at: string
}

async function setHandled(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { error } = await supabase.from('messages')
    .update({ handled: formData.get('status') === 'handled' })
    .eq('id', String(formData.get('id') ?? ''))
  revalidatePath('/admin/messages'); revalidatePath('/admin')
  return error
    ? { ok: false, message: friendlyError(error.message) }
    : { ok: true, message: formData.get('status') === 'handled' ? 'Marked as dealt with.' : 'Reopened.' }
}

async function remove(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { error } = await supabase.from('messages').delete().eq('id', String(formData.get('id') ?? ''))
  revalidatePath('/admin/messages'); revalidatePath('/admin')
  return error ? { ok: false, message: friendlyError(error.message) } : { ok: true, message: 'Message deleted.' }
}

export default async function AdminMessagesPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data } = await supabase.from('messages').select('*')
    .order('handled').order('created_at', { ascending: false })
  const messages = (data ?? []) as Message[]
  const unread = messages.filter((m) => !m.handled).length

  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">
            <span className="eyebrow__badge"><Icon name="shield" /></span>
            Committee only
          </p>
          <h1 className="display-2">Messages</h1>
          <p className="lede">
            Everything sent through the contact form. Only the committee can read
            these — a visitor can write one but cannot read anybody&rsquo;s back out.
          </p>
        </div>

        {unread > 0 && (
          <div className="panel panel--ink reveal u-mb-2">
            <h2 className="panel__title"><Icon name="mail" /> {unread} unread</h2>
            <p>Reply by email or phone, then mark them as dealt with.</p>
          </div>
        )}

        <AdminActionList
          items={messages.map((m): ActionItem => ({
            id: m.id,
            initial: m.name.charAt(0).toUpperCase(),
            title: m.name,
            badge: m.handled ? 'dealt with' : 'new',
            meta: [m.topic, m.email, m.phone, new Date(m.created_at).toLocaleDateString('en-GB')]
              .filter(Boolean).join(' · '),
            body: m.body,
            actions: [
              { label: m.handled ? 'Reopen' : 'Mark dealt with',
                fields: { id: m.id, status: m.handled ? 'new' : 'handled' }, action: 'status' },
              { label: 'Delete', fields: { id: m.id, status: '' }, action: 'remove' },
            ],
          }))}
          onStatus={setHandled}
          onRemove={remove}
          empty="No messages yet."
        />
      </div>
    </section>
  )
}
