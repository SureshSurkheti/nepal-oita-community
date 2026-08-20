'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/* The behavioural half of the design system, ported from the static site's
   app.js: reveal-on-scroll, the sticky header, and the progress thread.
   One effect rather than three components, because they all want the same
   scroll listener. */
export function SiteMotion() {
  const pathname = usePathname()

  /* ---- reveal on scroll ----
   *
   * Keyed on the pathname, and that is the whole point. This app navigates
   * without reloading, so a new page's elements appear in a DOM this effect has
   * already finished with. With an empty dependency array they were never
   * observed and never revealed — every page reached by clicking a link rendered
   * its header and footer (no .reveal on those) above a completely blank middle.
   * Loading the same URL directly worked fine, which is what made it look like a
   * page bug rather than a navigation one. */
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

    /* Photographs settling in.
     *
     * The theme starts these at opacity 0 and waits for .is-loaded, so a photo
     * fades in over the generated artwork instead of popping. Which means a
     * missing pass here does not degrade gracefully — it hides the image
     * altogether. That is exactly what happened to the hero: the file loaded,
     * the element was painted, and the photograph was invisible.
     *
     * On error the <img> is removed rather than marked loaded, so a file nobody
     * has supplied yet leaves the artwork showing rather than a broken-image
     * icon. Hardcoding .is-loaded in the markup would lose that. */
    const settle = (img: HTMLImageElement) => {
      if (!img.complete) return
      if (img.naturalWidth > 0) img.classList.add('is-loaded')
      else img.remove()
    }
    /* Every selector here has an `opacity: 0` rule in theme.css waiting on
       .is-loaded. Adding a new one of those without adding it to this list makes
       the image invisible with no error anywhere — which is how the hero
       photograph was lost once already. .ptile__img is the member cards. */
    const IMG_SELECTOR = '.hero__cell img, .hero__photo, .tile__img, .ptile__img,'
      + ' .qr-frame__img, .avatar__img, .quote__photo'

    const watch = (img: HTMLImageElement) => {
      // Listen as well as check: a lazy image far down the page has not been
      // fetched yet, so whichever happens first wins.
      img.addEventListener('load', () => settle(img))
      img.addEventListener('error', () => img.remove())
      settle(img)
    }

    document.querySelectorAll<HTMLImageElement>(IMG_SELECTOR).forEach(watch)

    // Elements are revealed once and left alone. Re-hiding on the way back up
    // makes a page feel like it is fighting the reader.
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))
    let observer: IntersectionObserver | null = null

    if (reduce.matches || !('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('is-in'))
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.add('is-in')
            observer?.unobserve(entry.target)
          })
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      )
      reveals.forEach((el) => observer!.observe(el))

      /* Anything already on screen when the page arrives is revealed at once,
         ignoring the rootMargin.
         
         That -8% bottom margin exists so a card animates in slightly after it
         crosses the edge, which is right for scrolling. But it also means
         content sitting in the bottom 8% of the viewport on arrival is visible
         to the reader and invisible to the observer, so it stays blank until
         they scroll. Whichever is on screen at load should simply be on screen. */
      requestAnimationFrame(() => {
        for (const el of reveals) {
          const box = el.getBoundingClientRect()
          if (box.top < window.innerHeight && box.bottom > 0) {
            el.classList.add('is-in')
            observer!.unobserve(el)
          }
        }
      })
    }

    /* Anything added to the page AFTER this effect has run.
     *
     * Neither the image pass nor the observer above can see it, and both of them
     * are gates: a .reveal starts at opacity 0, and so does an image. An element
     * nobody picks up is therefore not un-animated — it is invisible. The contact
     * form hit exactly this. Submitting it replaced the <form> with a <div>
     * confirmation, a different element type, so React built a new node the
     * observer had never heard of: 196px of real text at opacity 0. It read as
     * "the form vanished and nothing was sent", and the natural next move was to
     * send it again.
     *
     * On screen now: revealed at once. Anything appearing because somebody
     * clicked is already being looked at, and animating it in is a delay rather
     * than a flourish. Off screen: handed to the observer instead — otherwise a
     * navigation that swaps in a whole page of content would arrive with every
     * section pre-revealed and the scroll animation gone. */
    const settleNew = (el: HTMLElement) => {
      if (el.classList.contains('is-in')) return
      const box = el.getBoundingClientRect()
      const onScreen = box.top < window.innerHeight && box.bottom > 0
      if (onScreen || !observer) el.classList.add('is-in')
      else observer.observe(el)
    }

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          if (node.classList.contains('reveal')) settleNew(node)
          node.querySelectorAll<HTMLElement>('.reveal').forEach(settleNew)
          if (node instanceof HTMLImageElement) watch(node)
          node.querySelectorAll<HTMLImageElement>(IMG_SELECTOR).forEach(watch)
        }
      }
    })
    mutations.observe(document.body, { childList: true, subtree: true })

    return () => { observer?.disconnect(); mutations.disconnect() }
  }, [pathname])

  /* ---- sticky header and progress thread ----
   *
   * Set up once: the header outlives every navigation, so re-binding these on
   * each one would only churn listeners. */
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('[data-nav]')
    const toTop = document.querySelector<HTMLElement>('[data-to-top]')
    let span = 0

    const measure = () => {
      span = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
    }

    const onScroll = () => {
      const y = window.scrollY
      nav?.classList.toggle('is-stuck', y > 8)
      toTop?.classList.toggle('is-visible', y > window.innerHeight)
      // Written on the nav, not on :root. The thread is a child of the header,
      // and putting the variable on the element that uses it keeps a stray
      // selector elsewhere from picking it up.
      nav?.style.setProperty('--scroll-progress',
        span > 0 ? Math.min(y / span, 1).toFixed(4) : '0')
    }

    measure()
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    const ro = 'ResizeObserver' in window ? new ResizeObserver(measure) : null
    ro?.observe(document.body)

    return () => {
      ro?.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
    }
  }, [])

  return null
}
