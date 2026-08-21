import Link from 'next/link'
import type { Metadata } from 'next'
import { Icon, type IconName } from '@/components/Sprite'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Committee', robots: { index: false } }

export default async function AdminHome() {
  const me = await requireAdmin()
  const supabase = await createClient()

  // head:true asks Postgres for the count without shipping the rows.
  const count = async (table: string) => {
    const { count: n } = await supabase.from(table).select('*', { count: 'exact', head: true })
    return n ?? 0
  }

  const [members, events, stories, photos, messages, meetings] = await Promise.all([
    count('members'), count('events'), count('stories'), count('photos'), count('messages'),
    count('meetings'),
  ])

  const [{ count: pendingStories }, { count: newMessages }, { count: unlinked },
         { count: pendingMeetings }] = await Promise.all([
    supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('handled', false),
    // Who has not claimed their card. A missing phone number used to be the
    // thing that locked somebody out; since sign-in became email and password,
    // it is a missing link to an account.
    supabase.from('members').select('*', { count: 'exact', head: true }).is('user_id', null),
    supabase.from('meetings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  /* What the leadership team has added and nobody has published yet. Counted
     separately from the totals above because it is the only number on this page
     that is somebody else waiting on the committee. */
  const [{ count: draftEvents }, { count: draftPhotos }] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('is_published', false),
    supabase.from('photos').select('*', { count: 'exact', head: true }).eq('is_published', false),
  ])

  const cards: { href: string; icon: IconName; title: string; count: number; note: string }[] = [
    { href: '/admin/members', icon: 'users', title: 'Members', count: members,
      note: unlinked ? `${unlinked} have not claimed their card` : 'everyone has claimed their card' },
    { href: '/admin/events', icon: 'calendar', title: 'Events', count: events,
      note: draftEvents ? `${draftEvents} added, waiting to be published` : 'add, edit or unpublish' },
    { href: '/admin/stories', icon: 'send', title: 'Stories', count: stories,
      note: pendingStories ? `${pendingStories} waiting for approval` : 'nothing waiting' },
    { href: '/admin/photos', icon: 'images', title: 'Gallery', count: photos,
      note: draftPhotos ? `${draftPhotos} added, waiting to be published` : 'upload and caption photographs' },
    { href: '/admin/decisions', icon: 'check', title: 'Decisions', count: meetings,
      note: pendingMeetings ? `${pendingMeetings} waiting for approval` : 'nothing waiting' },
    { href: '/admin/messages', icon: 'mail', title: 'Messages', count: messages,
      note: newMessages ? `${newMessages} unread` : 'nothing new' },
  ]

  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">
            <span className="eyebrow__badge"><Icon name="shield" /></span>
            Committee only
          </p>
          <h1 className="display-2">Run the site</h1>
          <p className="lede">
            Signed in as {me.name}. Everything the site shows is edited from here —
            no files, no code.
          </p>
        </div>

        <div className="grid grid--3">
          {cards.map((c) => (
            <Link key={c.href} className="card reveal" href={c.href}>
              <div className="plate plate--crimson"><Icon name={c.icon} /></div>
              <h3 className="card__title">{c.title} <span className="muted">{c.count}</span></h3>
              <p className="card__body">{c.note}</p>
              <span className="link-arrow">Open <Icon name="arrow-right" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
