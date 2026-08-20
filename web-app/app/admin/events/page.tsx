import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { EventAdmin } from '@/components/EventAdmin'
import { todayInJapan } from '@/lib/content'

export const metadata: Metadata = { title: 'Committee — events', robots: { index: false } }

export default async function AdminEventsPage() {
  await requireAdmin()
  const supabase = await createClient()

  const [{ data: events }, { data: highlights }] = await Promise.all([
    supabase.from('events').select('*').order('event_date', { ascending: false }),
    supabase.from('event_highlights').select('*').order('position'),
  ])

  const byEvent = new Map<string, string[]>()
  for (const h of (highlights ?? []) as { event_id: string; text: string }[]) {
    const list = byEvent.get(h.event_id) ?? []
    list.push(h.text)
    byEvent.set(h.event_id, list)
  }

  const rows = (events ?? []).map((e) => ({
    ...(e as Record<string, unknown>),
    highlights: byEvent.get((e as { id: string }).id) ?? [],
  })) as Parameters<typeof EventAdmin>[0]['events']

  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">Committee only</p>
          <h1 className="display-2">Events</h1>
          <p className="lede">
            Adding an event here is all it takes — its page, its place in the timeline
            and its entry on the homepage all follow from the date. Nothing to upload.
          </p>
        </div>
        <EventAdmin events={rows} today={todayInJapan()} />
      </div>
    </section>
  )
}
