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
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
        })
      }
    >
      <Icon name="arrow-up" />
    </button>
  )
}
