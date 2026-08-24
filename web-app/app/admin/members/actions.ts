'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toE164 } from '@/lib/phone'

/* Every one of these goes through a SECURITY DEFINER function that checks
   is_admin() in the database. The check is not here — a Server Action is not a
   trust boundary you can see, and if the only guard were an `if` in this file,
   a change to routing or a future direct call would silently remove it. */

function slugify(name: string) {
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type ActionResult =
  | {
      ok: true
      message: string
      /* A freshly issued claim code, when there is one. Carried as its own field
         rather than baked into `message`, because the code has to be rendered
         differently from prose: monospace, large enough to read off a screen and
         copy off it, and next to a Copy button. It was inside the sentence, and
         the result was somebody trying to sign in with the member's NAME because
         the actual code was ten characters lost in the middle of a paragraph at
         the top of the page. */
      code?: string
      /** Which row the code belongs to, so it can be shown on that row. */
      memberId?: string
    }
  | { ok: false; message: string }

export async function addMember(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { ok: false, message: 'A name is required.' }

  const phoneRaw = String(formData.get('phone') ?? '').trim()
  let phone: string | null = null
  if (phoneRaw) {
    phone = toE164(phoneRaw)
    if (!phone) {
      return { ok: false, message: `“${phoneRaw}” is not a Japanese mobile number — it should start 070, 080 or 090.` }
    }
  }

  const { data: id, error } = await supabase.rpc('admin_upsert_member', {
    p_id: null,
    p_slug: String(formData.get('slug') ?? '').trim() || slugify(name),
    p_name: name,
    p_role: String(formData.get('role') ?? ''),
    p_profession: String(formData.get('profession') ?? ''),
    p_category: String(formData.get('category') ?? 'general'),
    p_sort_order: Number(formData.get('sort_order') ?? 100) || 100,
    p_published: true,
  })

  if (error) return { ok: false, message: errorMessage(error.message) }

  if (phone && id) {
    const { error: contactError } = await supabase.rpc('admin_set_member_contact', {
      p_member_id: id,
      p_phone: phone,
      p_facebook: null,
      p_email: null,
      p_note: null,
    })
    if (contactError) {
      return {
        ok: false,
        message: `${name} was added, but their number was not saved: ${errorMessage(contactError.message)}`,
      }
    }
  }

  revalidatePath('/admin/members')
  revalidatePath('/members')
  return {
    ok: true,
    message: phone
      ? `${name} added. They can sign in with that number now.`
      : `${name} added. They cannot sign in until you give them a number.`,
  }
}

export async function setPhone(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const memberId = String(formData.get('member_id') ?? '')
  const raw = String(formData.get('phone') ?? '').trim()

  const phone = raw ? toE164(raw) : null
  if (raw && !phone) {
    return { ok: false, message: `“${raw}” is not a Japanese mobile number.` }
  }

  const { error } = await supabase.rpc('admin_set_member_contact', {
    p_member_id: memberId,
    p_phone: phone,
    p_facebook: String(formData.get('facebook') ?? '') || null,
    p_email: String(formData.get('email') ?? '') || null,
    p_note: null,
  })
  if (error) return { ok: false, message: errorMessage(error.message) }

  revalidatePath('/admin/members')
  return { ok: true, message: phone ? 'Number saved.' : 'Number cleared.' }
}

export async function setAdmin(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_set_admin', {
    p_id: String(formData.get('member_id') ?? ''),
    p_is_admin: formData.get('is_admin') === 'true',
  })
  if (error) return { ok: false, message: errorMessage(error.message) }
  revalidatePath('/admin/members')
  return { ok: true, message: 'Committee access updated.' }
}

export async function removeMember(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_delete_member', {
    p_id: String(formData.get('member_id') ?? ''),
  })
  if (error) return { ok: false, message: errorMessage(error.message) }
  revalidatePath('/admin/members')
  revalidatePath('/members')
  return { ok: true, message: 'Member removed.' }
}

/** Turn Postgres's wording into something a committee member can act on. */
function errorMessage(raw: string): string {
  if (raw.includes('not authorised')) return 'Only the committee can do that.'
  if (raw.includes('only admin left')) return 'That is the only committee account left — promote somebody else first.'
  if (raw.includes('members_slug_key')) return 'There is already a member with that web address (slug).'
  if (raw.includes('member_contacts_phone_e164_key')) return 'That number is already registered to another member.'
  return raw
}

/* Issues a membership code and returns it in the result message.
 *
 * Shown once, on the committee's screen, and never stored in plaintext — so if
 * they navigate away before writing it down, the only remedy is to issue
 * another, which is why the message says so. That is a deliberate trade: a code
 * that could be looked up again later is a code sitting in the database waiting
 * to be read by whoever gets in next. */
export async function issueClaimCode(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_issue_claim_code', {
    p_member_id: String(formData.get('member_id') ?? ''),
  })
  if (error) return { ok: false, message: errorMessage(error.message) }
  revalidatePath('/admin/members')
  return {
    ok: true,
    message: '',                       // the panel says it all; no duplicate prose
    code: String(data),
    memberId: String(formData.get('member_id') ?? ''),
  }
}

/* The middle tier. Separate from setAdmin because they are separate decisions:
   "may add an event" and "may delete a member" are not the same trust, and a
   single control that did both is how everyone ends up an admin. */
export async function setContributor(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const can = String(formData.get('can_contribute')) === 'true'
  const { error } = await supabase.rpc('admin_set_contributor', {
    p_member_id: String(formData.get('member_id') ?? ''),
    p_can: can,
  })
  if (error) return { ok: false, message: errorMessage(error.message) }
  revalidatePath('/admin/members')
  return {
    ok: true,
    message: can
      ? 'They can now add events and meeting write-ups, for you to publish.'
      : 'They can no longer add events or meeting write-ups.',
  }
}

/* The committee filling in somebody else's card.
 *
 * The member's own version of this is /me, and that is still the right place for
 * anybody who can get to it. This exists for the rest of the register: people
 * who have not claimed an account, and people who sent their photograph to the
 * committee in a message and are never going to log in and upload it themselves.
 *
 * A missing field is sent as null, not as an empty string, and the two mean
 * different things in the database: null leaves the column alone, '' clears it.
 * That distinction is what stops "save the profession" from also wiping the
 * portrait — `photo` is only ever sent when a new file has just been uploaded,
 * or when the form is explicitly clearing the picture.
 *
 * As everywhere else on this page, the authorisation is admin_set_member_profile
 * checking is_admin() inside the database. There is no `if` in this file that
 * matters. */
export async function setMemberProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const memberId = String(formData.get('member_id') ?? '')
  if (!memberId) return { ok: false, message: 'No member was named.' }

  /* Absent field -> null -> leave it as it is. Present but empty -> '' -> clear
     it. `formData.get` returns null for a field the form did not include, which
     is exactly the distinction needed, so it is passed through rather than
     coerced with `?? ''`. */
  const field = (name: string) => {
    const v = formData.get(name)
    return v === null ? null : String(v).trim()
  }

  const { error } = await supabase.rpc('admin_set_member_profile', {
    p_member_id: memberId,
    p_photo_path: field('photo_path'),
    p_profession: field('profession'),
    p_facebook_url: tidyUrl(field('facebook_url')),
    p_instagram_url: tidyUrl(field('instagram_url')),
    p_tiktok_url: tidyUrl(field('tiktok_url')),
  })
  if (error) return { ok: false, message: errorMessage(error.message) }

  revalidatePath('/admin/members')
  revalidatePath('/members')
  revalidatePath('/')
  return { ok: true, message: 'Card updated, and live on the members page.' }
}

/* People type "instagram.com/name", or "@name", or paste the whole thing with
   tracking parameters on the end. Rejecting any of those would be pedantry, so
   the scheme is added if it is missing and the value is otherwise left alone —
   an href without one is read as a path on this site, which is how you get a
   link to nepaloitacommunity.com/instagram.com/name.
   
   null and '' both pass straight through, because they are the two instructions
   the function below distinguishes and neither is a URL to tidy. */
function tidyUrl(raw: string | null): string | null {
  if (raw === null || raw === '') return raw
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw.replace(/^\/+/, '')}`
}
