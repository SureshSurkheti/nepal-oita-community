'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DecisionsNotice } from './DecisionsNotice'

/* "There are new decisions" — the members-only banner, now fetched client-side.
 *
 * It used to be resolved in the root layout, which meant the layout called
 * getCurrentMember() and getMeetings(), which meant every page on the site read
 * cookies and none of them could be cached. A banner that only members ever see
 * was making the public pages slow for everybody.
 *
 * The read is safe to do from the browser because it is the same read the server
 * was doing: `meetings` is protected by RLS, so a visitor with no session gets
 * nothing back however this asks. Nothing here decides who may see a write-up —
 * 0016 does.
 *
 * Renders null until it has an answer, so the cached HTML and the first client
 * render agree and there is no banner flashing in and out. DecisionsNotice
 * handles its own dismissal in localStorage.
 */
export function DecisionsNoticeGate() {
  const [latest, setLatest] = useState<
    { id: string; title: string; heldOn: string } | null
  >(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !live) return

      /* Newest approved write-up only. `status` is filtered here as well as by
         the policy: the leadership team can additionally see taken-down ones,
         and a banner announcing a write-up that is off the site would be wrong. */
      const { data } = await supabase
        .from('meetings')
        .select('id, title, held_on, status')
        .eq('status', 'approved')
        .order('held_on', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!live || !data) return

      setLatest({
        id: data.id as string,
        title: data.title as string,
        heldOn: data.held_on as string,
      })
    })()
    return () => { live = false }
  }, [])

  if (!latest) return null
  return (
    <DecisionsNotice id={latest.id} title={latest.title}
                     dateLabel={longDate(latest.heldOn)} />
  )
}

/* Duplicated from lib/content.ts rather than imported: that module pulls in the
   server Supabase client, which reaches for next/headers and cannot be bundled
   into a client component. Three lines is cheaper than splitting the module. */
function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00+09:00`)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Tokyo',
  })
}
