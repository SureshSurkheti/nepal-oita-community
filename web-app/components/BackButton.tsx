'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon } from './Sprite'
import { stripLocale } from '@/lib/i18n'
import { useI18n } from '@/lib/useI18n'

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
 *
 * THE HOMEPAGE TEST HAS TO STRIP THE LOCALE, and for a long time it did not.
 * It compared usePathname() against '/', which was right before the site moved
 * under /[lang] and has been wrong ever since: the homepage is /en or /ne and
 * is NEVER '/', so the guard never fired and the button sat on the front page
 * offering to take you to the page you were already on. stripLocale('/en')
 * is '/', which is the comparison that was always meant.
 */
export function BackButton() {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useI18n()
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    setCanGoBack(window.history.length > 1)
  }, [pathname])

  // The homepage is where back would go, so it does not need one.
  if (stripLocale(pathname) === '/') return null

  /* Translated, which it also was not. The label was the English word in both
     languages — on /ne the one control that says what it does said it in the
     wrong one. */
  return (
    <button className="back-btn" type="button"
            onClick={() => (canGoBack ? router.back() : router.push('/'))}>
      <Icon name="arrow-right" flip />
      <span>{canGoBack ? t.nav.back : t.nav.home}</span>
    </button>
  )
}
