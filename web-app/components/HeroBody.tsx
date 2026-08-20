'use client'

import { useEffect } from 'react'

/* The theme makes the header transparent over a full-bleed hero via
   `body[data-hero]`. On the static site that attribute was written into each
   page's <body>; here the body lives in one shared layout, so the page that has
   a hero sets it on mount and clears it on the way out.
   
   Without the cleanup, navigating from the homepage to any other page would
   leave the nav transparent over ordinary white content. */
export function HeroBody() {
  useEffect(() => {
    document.body.dataset.hero = 'photo'
    return () => { delete document.body.dataset.hero }
  }, [])
  return null
}
