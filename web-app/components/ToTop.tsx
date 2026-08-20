'use client'

import { Icon } from './Sprite'

/* Its own client component because it needs an onClick, and the footer around
   it is a server component. Visibility is handled by SiteMotion, which adds
   .is-shown once you are a screen down the page. */
export function ToTop() {
  return (
    <button
      className="to-top"
      data-to-top
      type="button"
      aria-label="Back to top"
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
