/* Dates, as this site writes them.
 *
 * NOTHING IS IMPORTED HERE, AND THAT IS LOAD-BEARING. These used to live in
 * lib/content beside the queries that use them. lib/content reaches Supabase
 * through next/headers, and next/headers cannot be imported into a client
 * component — the build fails outright — so the moment a client component
 * needed longDate(), the whole module came with it. lib/content re-exports
 * every one of these, so nothing that already imported them had to change.
 *
 * Same reasoning as lib/covers; see the note at the top of that file. */
import type { Meeting } from '@/lib/types'

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

/** Whole days from today in Oita until an event's date. Negative once it is past.
 *
 *  COMPUTED ON THE SERVER AND PASSED DOWN AS A NUMBER, never recomputed in the
 *  browser. A countdown worked out during render would be read from the viewer's
 *  own clock, which is neither the server's nor Japan's — so a phone set an hour
 *  ahead would hydrate "In 13 days" over "In 12 days" and React would tear the
 *  text. Both ends are taken at UTC midnight, so the subtraction is exact whole
 *  days with no daylight-saving remainder to round away. */
export function daysUntil(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const [ty, tm, td] = todayInJapan().split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000)
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
