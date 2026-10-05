'use client'

import { Icon } from './Sprite'
import { useI18n } from '@/lib/useI18n'

/* Its own client component because it needs an onClick, and the footer around
   it is a server component. Visibility is handled by SiteMotion, which adds
   .is-shown once you are a screen down the page. */
export function ToTop() {
  const { t } = useI18n()
  return (
    <button
      className="to-top"
      data-to-top
      type="button"
      aria-label={t.nav.backToTop}
      /* Smooth only when there is little to travel. From the foot of the home
         page this is a 13,000px animation that the browser owns until it
         finishes — touch cannot cancel it, so the reader watches instead of
         scrolling, and anybody who swipes mid-flight thinks the page is stuck.
         Same two-screen rule as the in-page links in SiteMotion. */
      onClick={() => {
        const far = window.scrollY > window.innerHeight * 2
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: 0, behavior: far || reduce ? 'auto' : 'smooth' })
      }}
    >
      <Icon name="arrow-up" />
    </button>
  )
}
