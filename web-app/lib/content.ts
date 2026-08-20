import { createClient } from '@/lib/supabase/server'
import { supabaseEnv } from '@/lib/env'
import type { Meeting, MeetingPoint } from '@/lib/types'

type MeetingRow = Omit<Meeting, 'points'>

export type EventRow = {
  id: string; slug: string; title: string
  summary: string | null; body: string | null
  event_date: string
  start_time: string | null; end_time: string | null
  place: string | null; category: string | null; cost: string | null
  accent: 'crimson' | 'indigo' | 'moss' | 'gold'
  cover_path: string | null; register_email: string | null
  highlights: string[]
  past: boolean
}

export type Programme = {
  id: string; slug: string; title: string; body: string | null
  icon: string; accent: string; points: string[]
}

export type StoryRow = {
  id: string; author_name: string; author_role: string | null
  quote: string; photo_path: string | null
}

export type Photo = {
  id: string; storage_path: string; caption: string | null; alt: string | null
  category: string | null; credit: string | null; credit_url: string | null
  licence: string | null; licence_url: string | null
}

/** A contributor's own unpublished photographs.
 *
 *  getPhotos() filters on is_published, so these are invisible to it — and an
 *  upload that appears to vanish is an upload somebody does again. Returned by
 *  the photos_read_own policy; nobody else's drafts are in the result. */
export async function getMyDraftPhotos(): Promise<Photo[]> {
  const supabase = await createClient()
  const res = await supabase.from('photos').select('*')
    .eq('is_published', false)
    .order('created_at', { ascending: false })
  // Optional: a project without 0014 has no submitted_by and no read-own policy.
  return unwrap<Photo[]>('draft photographs', res, true)
}

/** A photo row reshaped for the tile grid, with its URL already resolved.
 *
 *  The tiles are a client component, so it cannot call assetUrl itself — that
 *  would pull this module, and with it the server Supabase client, into the
 *  browser bundle. Resolving here keeps the boundary a plain serialisable
 *  object. */
export function tilePhotos(photos: Photo[]) {
  return photos.map((p) => ({
    id: p.id,
    src: assetUrl('site-photos', p.storage_path),
    caption: p.caption,
    alt: p.alt,
    category: p.category,
    credit: p.credit,
    credit_url: p.credit_url,
    licence: p.licence,
    licence_url: p.licence_url,
  }))
}

/* Meeting decisions, newest first, with their points.
 *
 *  Only approved write-ups come back for a visitor — that is the read policy,
 *  not this function. A member also gets their own pending draft, because the
 *  policy grants them that; the caller separates the two by looking at status.
 *  Two queries rather than a join because the points table is small and PostgREST
 *  embedding would need a foreign-key hint that adds nothing here. */
export async function getMeetings(): Promise<Meeting[]> {
  const supabase = await createClient()

  const [meetingRes, pointRes] = await Promise.all([
    supabase.from('meetings').select('*').order('held_on', { ascending: false }),
    supabase.from('meeting_points').select('*').order('position'),
  ])

  // Optional: this is the newest feature, so a project that has not applied
  // 0012 yet should simply not show the section.
  const meetings = unwrap<MeetingRow[]>('meetings', meetingRes, true)
  const points = unwrap<(MeetingPoint & { meeting_id: string })[]>('meeting points', pointRes, true)

  const byMeeting = new Map<string, MeetingPoint[]>()
  for (const p of points) {
    const list = byMeeting.get(p.meeting_id) ?? []
    list.push(p)
    byMeeting.set(p.meeting_id, list)
  }

  return meetings.map((m) => ({ ...m, points: byMeeting.get(m.id) ?? [] }))
}

/** Public URL for a file in one of the site's storage buckets. */
export function assetUrl(bucket: 'site-photos' | 'member-photos', path?: string | null) {
  if (!path) return null
  return `${supabaseEnv().url}/storage/v1/object/public/${bucket}/${path}`
}

/** Today in Japan, as YYYY-MM-DD.
 *
 *  An event is on a *day* in Oita, so "has it happened" is a question about the
 *  local date, not an instant. Comparing against the server's own clock would
 *  age events out a day early or late depending on where the server is — and on
 *  Vercel that is not somewhere you control. */
export function todayInJapan(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

/* Every query below goes through this.
 *
 * The first version destructured `{ data }` and ignored `error`, so when the
 * Supabase URL was wrong EVERY query failed and every page rendered as though
 * the community simply had no events, no photographs and no members. It looked
 * like empty data, not like a broken connection, and that is a genuinely
 * expensive kind of bug to chase.
 *
 * Failing loudly is the right trade for content a visitor is meant to see. */
/* PostgREST says this when the table is not in its schema cache at all, which
   in practice means the migration that creates it has not been run. That is a
   different situation from a query failing against a table that exists, and it
   deserves a different answer: the feature is not installed yet, so the section
   is absent — rather than the whole page being unreachable until somebody
   pastes some SQL. Every other error still throws, because every other error
   means something is wrong rather than merely absent. */
function isMissingTable(message: string): boolean {
  return /could not find the table|does not exist|schema cache/i.test(message)
}

function unwrap<T>(what: string, res: { data: T | null; error: { message: string } | null },
                   optional = false): T {
  if (res.error) {
    if (optional && isMissingTable(res.error.message)) return [] as unknown as T
    throw new Error(
      `Could not load ${what} from Supabase: ${res.error.message}\n`
      + 'If this says "Invalid path", check NEXT_PUBLIC_SUPABASE_URL — it should be\n'
      + 'https://<project>.supabase.co with no /rest/v1 on the end.',
    )
  }
  return (res.data ?? []) as T
}

export async function getEvents(): Promise<EventRow[]> {
  const supabase = await createClient()
  const [evRes, hlRes] = await Promise.all([
    supabase.from('events').select('*').eq('is_published', true).order('event_date'),
    supabase.from('event_highlights').select('*').order('position'),
  ])
  const events = unwrap<Record<string, unknown>[]>('events', evRes)
  const highlights = unwrap<{ event_id: string; text: string }[]>('event highlights', hlRes)

  const byEvent = new Map<string, string[]>()
  for (const h of highlights) {
    const list = byEvent.get(h.event_id) ?? []
    list.push(h.text)
    byEvent.set(h.event_id, list)
  }

  const today = todayInJapan()
  return (events as unknown as Omit<EventRow, 'highlights' | 'past'>[]).map((e) => ({
    ...e,
    highlights: byEvent.get(e.id) ?? [],
    past: e.event_date < today,
  }))
}

export async function getEvent(slug: string): Promise<EventRow | null> {
  const all = await getEvents()
  return all.find((e) => e.slug === slug) ?? null
}

/** A contributor's own unpublished events, newest first.
 *
 *  getEvents() filters on is_published, so a draft is invisible to it by
 *  definition — and a submission that vanishes is a submission somebody files
 *  again. The events_read_own policy is what returns these; anybody else's
 *  drafts are not in the result whatever this asks for. */
export async function getMyDraftEvents(): Promise<EventRow[]> {
  const supabase = await createClient()
  const res = await supabase.from('events').select('*')
    .eq('is_published', false)
    .order('event_date', { ascending: false })
  // Optional: a project that has not applied 0013 has no submitted_by column
  // and no events_read_own policy, so this is expected to come back empty.
  const rows = unwrap<Record<string, unknown>[]>('draft events', res, true)
  return rows.map((e) => ({ ...e, highlights: [], past: false })) as unknown as EventRow[]
}

export async function getProgrammes(): Promise<Programme[]> {
  const supabase = await createClient()
  const [pRes, ptRes] = await Promise.all([
    supabase.from('programmes').select('*').eq('is_published', true).order('sort_order'),
    supabase.from('programme_points').select('*').order('position'),
  ])
  const progs = unwrap<Record<string, unknown>[]>('programmes', pRes)
  const points = unwrap<{ programme_id: string; text: string }[]>('programme points', ptRes)
  const byProg = new Map<string, string[]>()
  for (const p of points) {
    const list = byProg.get(p.programme_id) ?? []
    list.push(p.text)
    byProg.set(p.programme_id, list)
  }
  return (progs as unknown as Omit<Programme, 'points'>[]).map((p) => ({
    ...p, points: byProg.get(p.id) ?? [],
  }))
}

export async function getStories(): Promise<StoryRow[]> {
  const supabase = await createClient()
  return unwrap<StoryRow[]>('stories', await supabase
    .from('stories').select('*').eq('status', 'approved').order('sort_order'))
}

export async function getPhotos(): Promise<Photo[]> {
  const supabase = await createClient()
  return unwrap<Photo[]>('photos', await supabase
    .from('photos').select('*').eq('is_published', true).order('sort_order'))
}

/** "Sunday 18 October 2026" — how the date is written for a reader. */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  // Built from parts, at midday UTC. `new Date("2026-10-18")` is UTC midnight,
  // which in Japan is already the 18th but in London is still the 17th — the
  // exact bug that made events age out a day early on the static site.
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)))
}

/** "August 2026" — the month heading used above a run of meetings. */
export function monthYear(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 15)))
}

/** Meetings grouped into the months they were held in, newest month first.
 *
 *  The committee meets monthly, so the month is the unit somebody thinks in
 *  ("what did we decide in August?"). Grouping is done here rather than in the
 *  page so the homepage and /decisions cannot drift into two different ideas of
 *  where a month starts. Input must already be sorted by date descending, which
 *  getMeetings() guarantees. */
export function byMonth(meetings: Meeting[]): { key: string; label: string; meetings: Meeting[] }[] {
  const out: { key: string; label: string; meetings: Meeting[] }[] = []
  for (const m of meetings) {
    const key = m.held_on.slice(0, 7)
    const last = out[out.length - 1]
    if (last && last.key === key) last.meetings.push(m)
    else out.push({ key, label: monthYear(m.held_on), meetings: [m] })
  }
  return out
}

/** { month: 'Oct', day: '18' } for the date chip. */
export function chipDate(iso: string): { month: string; day: string } {
  const [y, m, d] = iso.split('-').map(Number)
  const at = new Date(Date.UTC(y, m - 1, d, 12))
  return {
    month: new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(at),
    day: String(d).padStart(2, '0'),
  }
}
