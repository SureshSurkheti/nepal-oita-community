'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { slugify, friendlyError } from '@/lib/admin'

export type Result = { ok: boolean; message: string }

/* Events, programmes, photos and stories are admin-only tables: an ordinary
   member has no business writing any column, so they use plain grants plus an
   is_admin() policy rather than the SECURITY DEFINER functions the members table
   needs. A non-admin reaching these actions writes nothing — the policy refuses
   it, not this file. */

function fields(f: FormData) {
  const title = String(f.get('title') ?? '').trim()
  return {
    title,
    slug: String(f.get('slug') ?? '').trim() || slugify(title),
    summary: String(f.get('summary') ?? '').trim() || null,
    body: String(f.get('body') ?? '').trim() || null,
    event_date: String(f.get('event_date') ?? '').trim(),
    start_time: String(f.get('start_time') ?? '').trim() || null,
    end_time: String(f.get('end_time') ?? '').trim() || null,
    place: String(f.get('place') ?? '').trim() || null,
    category: String(f.get('category') ?? '').trim() || null,
    cost: String(f.get('cost') ?? '').trim() || null,
    accent: String(f.get('accent') ?? 'crimson'),
    register_email: String(f.get('register_email') ?? '').trim() || null,
    is_published: f.get('is_published') !== 'false',
  }
}

async function setHighlights(eventId: string, raw: string) {
  const supabase = await createClient()
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  // Replaced wholesale rather than merged: editing a list by diffing it is how
  // duplicates and orphans creep in.
  await supabase.from('event_highlights').delete().eq('event_id', eventId)
  if (lines.length === 0) return
  await supabase.from('event_highlights').insert(
    lines.map((text, position) => ({ event_id: eventId, text, position })),
  )
}

export async function saveEvent(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const v = fields(formData)

  if (!v.title) return { ok: false, message: 'An event needs a title.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.event_date)) {
    return { ok: false, message: 'Pick a date.' }
  }

  const { data, error } = id
    ? await supabase.from('events').update(v).eq('id', id).select('id').single()
    : await supabase.from('events').insert(v).select('id').single()

  if (error) return { ok: false, message: friendlyError(error.message) }

  await setHighlights(data.id, String(formData.get('highlights') ?? ''))

  revalidatePath('/admin/events')
  revalidatePath('/events')
  revalidatePath(`/events/${v.slug}`)
  revalidatePath('/')
  return { ok: true, message: id ? `“${v.title}” saved.` : `“${v.title}” added.` }
}

export async function deleteEvent(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('events').delete().eq('id', String(formData.get('id') ?? ''))
  if (error) return { ok: false, message: friendlyError(error.message) }
  revalidatePath('/admin/events'); revalidatePath('/events'); revalidatePath('/')
  return { ok: true, message: 'Event removed.' }
}

export async function togglePublished(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('events')
    .update({ is_published: formData.get('to') === 'true' })
    .eq('id', String(formData.get('id') ?? ''))
  if (error) return { ok: false, message: friendlyError(error.message) }
  revalidatePath('/admin/events'); revalidatePath('/events'); revalidatePath('/')
  return { ok: true, message: formData.get('to') === 'true' ? 'Published.' : 'Hidden from the site.' }
}
