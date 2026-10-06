'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from './Sprite'
import { EventProposeForm } from './EventProposeForm'
import { PhotoProposeForm } from './PhotoProposeForm'
import { StoryForm, type OwnStory } from './StoryForm'
import { longDate } from '@/lib/dates'

/* The "propose something" block on /events, /gallery and /stories — RESOLVED IN
 * THE BROWSER, and that is the entire point of this file.
 *
 * WHAT IT FIXES. Each of those three pages ended with a panel only a contributor
 * may see, so each one called getCurrentMember() on the server, which reads
 * cookies, which forced the whole route dynamic. Measured on the live site:
 *
 *     /              x-vercel-cache: HIT      (fixed earlier, the same way)
 *     /programmes    x-vercel-cache: HIT
 *     /arriving      x-vercel-cache: HIT
 *     /events        x-vercel-cache: MISS  <- this file
 *     /gallery       x-vercel-cache: MISS  <- this file
 *     /stories       x-vercel-cache: MISS  <- this file
 *
 * Three of the five pages a search engine is told to index were rebuilt from
 * scratch, with a round trip to Supabase, for every single visitor — to decide
 * whether to draw a form that almost none of them may use. The content above
 * the form is identical for everybody.
 *
 * NOTHING HERE DECIDES WHO MAY CONTRIBUTE. It renders a form; the database
 * decides whether anything it submits is accepted, exactly as before. `anon`
 * cannot insert an event, a photograph or a story, and `is_published` and
 * `status` are in no grant any member holds — so the worst a forged `canAdd`
 * achieves is a form that returns an error. The gate was never in this layer.
 *
 * IT RENDERS NOTHING UNTIL THE ANSWER IS KNOWN, like HomeMinutes: a visitor
 * must never watch a "Suggest an event" panel appear and then vanish. The block
 * sits below the content in all three cases, so a member waiting a moment for
 * it has lost nothing.
 */

type Member = {
  id: string
  slug: string
  name: string
  role: string | null
  photo_path: string | null
  can_contribute: boolean
  is_admin: boolean
}

type Draft = { id: string; title: string; meta: string }

export function ContributeGate({ kind }: { kind: 'event' | 'photo' | 'story' }) {
  const [member, setMember] = useState<Member | null | undefined>(undefined)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [own, setOwn] = useState<OwnStory[]>([])

  useEffect(() => {
    const supabase = createClient()
    let live = true

    async function read() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!live) return
      if (!user) { setMember(null); return }

      const { data: m } = await supabase.from('members')
        .select('id, slug, name, role, photo_path, can_contribute, is_admin')
        .eq('user_id', user.id).maybeSingle()
      if (!live) return
      if (!m) { setMember(null); return }
      setMember(m as Member)

      /* Their own unpublished submissions, so a proposal does not appear to
         vanish while it waits. Every one of these is an ordinary select that
         RLS answers — a read-own policy returns the rows, and a project that is
         behind on migrations returns an error, which is treated as none. */
      if (kind === 'event') {
        const { data } = await supabase.from('events')
          .select('id, title, event_date, place')
          .eq('is_published', false).order('event_date', { ascending: false })
        if (!live) return
        setDrafts((data ?? []).map((d) => ({
          id: d.id as string, title: d.title as string,
          meta: longDate(d.event_date as string) + (d.place ? ` · ${d.place}` : ''),
        })))
      } else if (kind === 'photo') {
        const { data } = await supabase.from('photos')
          .select('id, caption, category')
          .eq('is_published', false).order('created_at', { ascending: false })
        if (!live) return
        setDrafts((data ?? []).map((d) => ({
          id: d.id as string, title: (d.caption as string) ?? 'Untitled',
          meta: (d.category as string) ?? 'no category',
        })))
      } else {
        const { data } = await supabase.from('stories')
          .select('id, quote, author_role, quote_ne, author_role_ne, status')
          .eq('member_id', (m as Member).id).order('created_at', { ascending: false })
        if (!live) return
        setOwn((data ?? []) as OwnStory[])
      }
    }

    read()
    return () => { live = false }
  }, [kind])

  // Still asking. Nothing on screen, by design — see the note above.
  if (member === undefined) return null

  /* Stories is the exception: StoryForm handles the signed-out case itself with
     a "this is for members, sign in" panel, which is the right thing on a page
     whose whole subject is members talking. The other two show nothing. */
  if (kind === 'story') {
    return (
      <div className="mt-lg u-measure-center">
        <StoryForm
          member={member && {
            id: member.id, name: member.name,
            role: member.role, photo_path: member.photo_path,
          }}
          own={own}
        />
      </div>
    )
  }

  if (!member || !(member.can_contribute || member.is_admin)) return null

  return (
    <div className={kind === 'event' ? 'u-measure-center u-mb-2' : 'u-measure-center mt-lg'}>
      {drafts.length > 0 && (
        <div className="panel u-mb-15">
          <h2 className="panel__title">
            <Icon name="clock" />{' '}
            {kind === 'event'
              ? 'Waiting to be published'
              : `${drafts.length} waiting to be published`}
          </h2>
          <ul className="roster">
            {drafts.map((d) => (
              <li key={d.id}>
                <span className="avatar" aria-hidden="true">
                  <Icon name={kind === 'event' ? 'clock' : 'images'} />
                </span>
                <span>
                  <span className="roster__name">{d.title}</span><br />
                  <span className="roster__meta">{d.meta}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {kind === 'event'
        ? <EventProposeForm memberId={member.id} />
        : <PhotoProposeForm memberId={member.id} slug={member.slug} />}
    </div>
  )
}
