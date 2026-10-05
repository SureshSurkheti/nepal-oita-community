'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { slugify, friendlyError } from '@/lib/admin'

export type Result = { ok: boolean; message: string }

/* Events, programmes, photos and stories are admin-only tables: an ordinary
   member has no business writing any column, so they use plain grants plus an
   is_admin() policy rather than the SECURITY DEFINER functions the members table
   needs. A non-admin reaching these actions writes nothing — the policy refuses
   it, not this file. */

/* The Nepali columns, separated from the rest on purpose.
 *
 * title_ne, summary_ne and body_ne arrive with migration 0020/0021, and until
 * that has been run on a project they DO NOT EXIST. Writing them in the same
 * statement as the English columns would mean an event could not be saved at all
 * on a database that is a migration behind — the committee would lose the whole
 * form to a feature they were not using. So they go in a second, optional write
 * that is allowed to fail, and failing says so instead of being swallowed. */
function nepaliFields(f: FormData) {
  return {
    title_ne: String(f.get('title_ne') ?? '').trim() || null,
    summary_ne: String(f.get('summary_ne') ?? '').trim() || null,
    body_ne: String(f.get('body_ne') ?? '').trim() || null,
  }
}

/* PostgREST says PGRST204 when a column is not in its schema cache and Postgres
   says 42703 when it does not exist at all. Either one means the same thing
   here: the migration has not been run. Anything else is a real failure and must
   not be reported as a missing migration. */
function isMissingColumn(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('pgrst204')
    || m.includes('42703')
    || (m.includes('column') && (m.includes('does not exist') || m.includes('could not find')))
}

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
    /* The cover photograph's key in the site-photos bucket. The column has
       existed since 0004 and was never written to or read — so every event has
       been a block of text with a coloured edge. The file itself is uploaded
       from the browser before this runs; all that arrives here is the key. */
    cover_path: String(f.get('cover_path') ?? '').trim() || null,
    is_published: f.get('is_published') !== 'false',
  }
}

/* Returns true if the Nepali column could not be written, so the caller can say
   so rather than leaving the translations silently dropped. */
async function setHighlights(eventId: string, raw: string, rawNe: string): Promise<boolean> {
  const supabase = await createClient()

  /* PAIRED BY LINE NUMBER IN THE ORIGINAL TEXT, which is the only pairing two
     plain textareas can express — and the pairing has to be worked out BEFORE
     the blank English lines are dropped. Filtering the two lists independently
     is the bug: leave English line 2 empty and every Nepali line from there on
     attaches to the wrong English one, quietly, with nothing on screen to show
     it. So the lists are zipped first and filtered second. */
  const en = raw.split('\n').map((l) => l.trim())
  const ne = rawNe.split('\n').map((l) => l.trim())
  const rows = en
    .map((text, i) => ({ text, text_ne: ne[i] || null }))
    .filter((r) => r.text)
    .map((r, position) => ({ event_id: eventId, position, ...r }))

  // Replaced wholesale rather than merged: editing a list by diffing it is how
  // duplicates and orphans creep in.
  await supabase.from('event_highlights').delete().eq('event_id', eventId)
  if (rows.length === 0) return false

  const { error } = await supabase.from('event_highlights').insert(rows)
  if (!error) return false

  /* text_ne arrives with migration 0021. Without it the insert above fails
     outright, which would lose the English list too — so it is retried without
     the Nepali column and the caller is told why. */
  if (!isMissingColumn(error.message)) return false
  await supabase.from('event_highlights')
    .insert(rows.map(({ text_ne: _ne, ...rest }) => rest))
  return true
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

  /* The Nepali columns, written separately and allowed to fail — see
     nepaliFields. The English half of the event is already saved by this point,
     so a database that is a migration behind costs the translation and nothing
     else. */
  let nepaliMissing = false
  const ne = nepaliFields(formData)
  if (ne.title_ne || ne.summary_ne || ne.body_ne) {
    const { error: neError } = await supabase.from('events').update(ne).eq('id', data.id)
    if (neError) {
      if (!isMissingColumn(neError.message)) {
        return { ok: false, message: friendlyError(neError.message) }
      }
      nepaliMissing = true
    }
  }

  const highlightsNeMissing = await setHighlights(
    data.id,
    String(formData.get('highlights') ?? ''),
    String(formData.get('highlights_ne') ?? ''),
  )
  nepaliMissing = nepaliMissing || highlightsNeMissing

  revalidatePath('/admin/events')
  revalidatePath('/events')
  revalidatePath(`/events/${v.slug}`)
  revalidatePath('/')
  /* The published-events read is cached for five minutes (see lib/content.ts).
     revalidatePath alone does not clear it — the page would re-render and read
     the same stale cache entry. Without this line, pressing Publish appears to
     do nothing, and the natural response is to press it again. */
  updateTag('events')
  const saved = id ? `“${v.title}” saved.` : `“${v.title}” added.`
  /* Said plainly, because the alternative is a committee member translating an
     event three times and wondering why the Nepali page never changes. */
  return {
    ok: true,
    message: nepaliMissing
      ? `${saved} The Nepali was NOT saved — this database has not had `
        + `supabase/RUN-IN-SQL-EDITOR.sql run on it yet, so the Nepali columns do `
        + `not exist. Run it, then put the Nepali back in.`
      : saved,
  }
}

export async function deleteEvent(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('events').delete().eq('id', String(formData.get('id') ?? ''))
  if (error) return { ok: false, message: friendlyError(error.message) }
  revalidatePath('/admin/events'); revalidatePath('/events'); revalidatePath('/')
  updateTag('events')
  return { ok: true, message: 'Event removed.' }
}

export async function togglePublished(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('events')
    .update({ is_published: formData.get('to') === 'true' })
    .eq('id', String(formData.get('id') ?? ''))
  if (error) return { ok: false, message: friendlyError(error.message) }
  revalidatePath('/admin/events'); revalidatePath('/events'); revalidatePath('/')
  updateTag('events')
  return { ok: true, message: formData.get('to') === 'true' ? 'Published.' : 'Hidden from the site.' }
}
