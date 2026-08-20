export type Category = 'leadership' | 'general'

export type Member = {
  id: string
  user_id: string | null
  slug: string
  name: string
  role: string | null
  profession: string | null
  initials: string | null
  category: Category
  photo_path: string | null
  /* Public. Private contact details stay on MemberContact below, which the
     database will not return to anyone who is not a verified member. Social
     handles are already public wherever they point, so keeping them in the
     private table only meant they could not be shown at all. */
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  sort_order: number
  is_published: boolean
  /** May add events and meeting write-ups, for the committee to publish. */
  can_contribute: boolean
  /** May also edit, delete, publish and approve. Implies can_contribute. */
  is_admin: boolean
}

/** Only ever fetched for a signed-in member. `anon` holds no grant on the
 *  underlying table, so for the public this type has no data behind it. */
export type MemberContact = {
  member_id: string
  phone_e164: string | null
  /** @deprecated Superseded by Member.facebook_url, which is public. */
  facebook_url: string | null
  email: string | null
}

export type MeetingPoint = { id: string; text: string; position: number }

export type Meeting = {
  id: string
  held_on: string
  title: string
  summary: string | null
  place: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_by: string | null
  created_at: string
  points: MeetingPoint[]
}

export type MemberWithContact = Member & { contact?: MemberContact | null }
