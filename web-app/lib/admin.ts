import { redirect } from 'next/navigation'
import { getCurrentMember } from '@/lib/members'
import type { Member } from '@/lib/types'

/** Every /admin page starts with this.
 *
 *  It is a signpost, not the lock. The lock is is_admin() inside the database:
 *  a non-admin who reached these pages anyway would be served nothing and could
 *  write nothing, because every query and every mutation is checked there. This
 *  just saves them staring at an empty screen. */
export async function requireAdmin(): Promise<Member> {
  const member = await getCurrentMember()
  if (!member) redirect('/sign-in')
  if (!member.is_admin) redirect('/members')
  return member
}

/** Postgres wording turned into something a committee member can act on. */
export function friendlyError(raw: string): string {
  if (raw.includes('not authorised')) return 'Only the committee can do that.'
  if (raw.includes('only admin left')) return 'That is the only committee account left — promote somebody else first.'
  if (raw.includes('members_slug_key')) return 'There is already a member with that web address (slug).'
  if (raw.includes('events_slug_key')) return 'There is already an event with that web address (slug).'
  if (raw.includes('photos_storage_path_key')) return 'That photo file is already in the gallery.'
  if (raw.includes('member_contacts_phone_e164_key')) return 'That number is already registered to another member.'
  if (raw.includes('violates check constraint')) return 'One of the values is not allowed — check the date and the category.'
  return raw
}

export function slugify(text: string): string {
  return text.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
