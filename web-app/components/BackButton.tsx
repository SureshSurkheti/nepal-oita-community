'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon } from './Sprite'

/* A back control on every page except the homepage.
 *
 * router.back() rather than a link, because "back" should mean the page you came
 * from — but only when there IS one. Arriving straight on /members from a shared
 * link leaves nothing in this tab's history, and a back button that does nothing
 * is worse than no back button. So it checks: with history to go back to it goes
 * back, and without it goes home.
 *
 * window.history.length is the only thing available for that and it is not
 * exact — it counts entries, not entries within this site. Landing on 1 is
 * reliable though, which is the case that matters.
 */
export function BackButton() {
  const router = useRouter()
  const pathname = usePathname()
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    setCanGoBack(window.history.length > 1)
  }, [pathname])

  // The homepage is where back would go, so it does not need one.
  if (pathname === '/') return null

  return (
    <button className="back-btn" type="button"
            onClick={() => (canGoBack ? router.back() : router.push('/'))}>
      <Icon name="arrow-right" flip />
      <span>{canGoBack ? 'Back' : 'Home'}</span>
    </button>
  )
}
