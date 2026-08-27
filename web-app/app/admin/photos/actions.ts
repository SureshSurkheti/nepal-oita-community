'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { friendlyError } from '@/lib/admin'

export type Result = { ok: boolean; message: string }

/* The file itself is uploaded straight from the browser to Supabase Storage —
   it never passes through this server. That is deliberate: a 4 MB photograph
   routed through a server action would be encoded into the request body and
   count against the platform's payload limit for no benefit. The storage policy
   checks is_admin() on the way in. */

export async function savePhoto(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const row = {
    storage_path: String(formData.get('storage_path') ?? '').trim(),
    caption: String(formData.get('caption') ?? '').trim() || null,
    alt: String(formData.get('alt') ?? '').trim() || null,
    category: String(formData.get('category') ?? '').trim() || null,
    credit: String(formData.get('credit') ?? '').trim() || null,
    credit_url: String(formData.get('credit_url') ?? '').trim() || null,
    licence: String(formData.get('licence') ?? '').trim() || null,
    licence_url: String(formData.get('licence_url') ?? '').trim() || null,
    sort_order: Number(formData.get('sort_order') ?? 100) || 100,
    is_published: formData.get('is_published') !== 'false',
  }

  if (!row.storage_path) return { ok: false, message: 'Choose a file first.' }

  const { error } = id
    ? await supabase.from('photos').update(row).eq('id', id)
    : await supabase.from('photos').insert(row)

  if (error) return { ok: false, message: friendlyError(error.message) }

  revalidatePath('/admin/photos'); revalidatePath('/gallery'); revalidatePath('/')
  updateTag('photos')   // the cached gallery read; see lib/content.ts
  return { ok: true, message: id ? 'Photograph updated.' : 'Photograph added to the gallery.' }
}

export async function deletePhoto(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const path = String(formData.get('storage_path') ?? '')

  const { error } = await supabase.from('photos').delete().eq('id', String(formData.get('id') ?? ''))
  if (error) return { ok: false, message: friendlyError(error.message) }

  /* Remove the file too, or the bucket fills with photographs nothing points at.
     Row first, file second: if the delete of the file fails the gallery is
     already correct, whereas the other order can leave a row pointing at
     nothing. */
  if (path) await supabase.storage.from('site-photos').remove([path])

  revalidatePath('/admin/photos'); revalidatePath('/gallery'); revalidatePath('/')
  updateTag('photos')   // the cached gallery read; see lib/content.ts
  return { ok: true, message: 'Photograph removed.' }
}
