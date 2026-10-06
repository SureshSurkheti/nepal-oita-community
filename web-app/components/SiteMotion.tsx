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
    /* `:not(.hero__slide)` keeps the rotating hero out of this. Those slides are
       managed by HeroSlideshow, which needs to know which of them decoded in
       order to decide what to fade to — and this watcher REMOVES an image that
       fails, which on a React-rendered element leaves the component holding a
       reference to a node no longer in the document. The page-head hero is a
       plain <img> with no slide class, so it is still watched here. */
    const IMG_SELECTOR = '.hero__cell img:not(.hero__slide), .hero__photo, .tile__img, .ptile__img,'
      + ' .qr-frame__img, .avatar__img, .quote__photo, .lightbox__frame img'
    /* The lightbox image is the one exception: it has no `opacity: 0` rule, and
       is listed only for the `error` half of watch(). A gallery row can exist
       before its file has been uploaded — the tile falls back to its drawn
       artwork, but the viewer opened on a broken-image icon, because the <img>
       inside it was not being watched by anything. Removing it leaves the frame
       and the caption, which is the same fallback the tile gets. */

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

    /* EVERYTHING BELOW IS BATCHED INTO A FRAME, and that is the point of this
     * block rather than a nicety.
     *
     * The reported fault is that a SLOW scroll is fine and a FAST one stalls
     * near the foot of the page. That asymmetry is the signature of main-thread
     * work per event rather than per frame: scrolling gently fires a handful of
     * scroll events with idle time between them, and a fling fires a flood of
     * them with none.
     *
     * Two things here were doing layout work per event.
     *
     * 1. onScroll wrote to the DOM every time it ran — two classList.toggle
     *    calls and a custom property ON THE FIXED HEADER, which is the one
     *    element composited over everything else for the whole length of the
     *    page. Every write invalidated it. Now at most one write per frame, and
     *    the property is only written when its 3-decimal value actually
     *    changes, which during a fling is far less often than the events arrive.
     *
     * 2. measure() read documentElement.scrollHeight, and it was wired straight
     *    into a ResizeObserver on document.body. Reading scrollHeight forces a
     *    synchronous layout, and a ResizeObserver callback is the worst place to
     *    do it: on a phone the address bar hides and shows AS YOU FLING, which
     *    resizes the body, which fired this, which forced a layout in the middle
     *    of the fling. A desktop browser has no address bar to hide, which is
     *    why this never reproduced here. The read is now deferred to a frame of
     *    its own and coalesced, so a burst of resizes costs one layout rather
     *    than one each. */
    let frame = 0
    let lastProgress = ''

    const apply = () => {
      frame = 0
      const y = window.scrollY
      nav?.classList.toggle('is-stuck', y > 8)
      toTop?.classList.toggle('is-visible', y > window.innerHeight)
      // Written on the nav, not on :root. The thread is a child of the header,
      // and putting the variable on the element that uses it keeps a stray
      // selector elsewhere from picking it up.
      const progress = span > 0 ? Math.min(y / span, 1).toFixed(3) : '0'
      if (progress !== lastProgress) {
        lastProgress = progress
        nav?.style.setProperty('--scroll-progress', progress)
      }
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(apply)
    }

    let measureFrame = 0
    const measure = () => {
      span = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
      measureFrame = 0
    }
    const scheduleMeasure = () => {
      if (measureFrame) return
      measureFrame = requestAnimationFrame(measure)
    }

    measure()
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', scheduleMeasure)
    const ro = 'ResizeObserver' in window ? new ResizeObserver(scheduleMeasure) : null
    ro?.observe(document.body)

    return () => {
      ro?.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', scheduleMeasure)
      if (frame) cancelAnimationFrame(frame)
      if (measureFrame) cancelAnimationFrame(measureFrame)
    }
  }, [])

  /* SMOOTH SCROLLING IS OPT-IN NOW, FOR SHORT IN-PAGE JUMPS ONLY.
   *
   * `html { scroll-behavior: smooth }` used to be set globally in theme.css and
   * caused two distinct faults, both of which read as "the page is stuck":
   *
   *   1. Tapping a far link — Contact is 12,000px down the home page — started
   *      an animation the browser owns until it ends. Measured on the live
   *      site: three upward swipes during it moved the page the WRONG way
   *      (-8778, -2926, -323) before control came back.
   *
   *   2. Flinging fast overscrolls past the end of the document, and the
   *      browser scrolls back to clamp it. Smooth made that clamp an animation
   *      too, so the next fling landed inside it and did nothing. Scrolling
   *      slowly never overscrolls, which is why slow was always fine and fast
   *      was not — and why it never reproduced on a desktop, where a mouse
   *      wheel does not fling.
   *
   * The first was patched by switching the global OFF for long jumps. That left
   * the second untouched, because nothing clicks anything when you fling. So
   * the global is gone and this turns it ON instead, for the one case it was
   * ever wanted: following a link to something within two screens, where seeing
   * the page move tells you where you went. Everything else — flings, clamps,
   * the back button, scroll restoration — gets the browser's own behaviour,
   * which no one has ever described as stuck.
   *
   * Still done by flipping the property rather than calling scrollTo(): the
   * browser's own hash handling already honours scroll-margin-top on every
   * section, and reimplementing that is how headings end up under the fixed
   * header. */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const TWO_SCREENS = () => window.innerHeight * 2
    let clear: ReturnType<typeof setTimeout> | null = null

    /* CAPTURE, and a timer rather than a frame — both for the same reason.
     * These links are next/link, so the anchor's own handler calls
     * preventDefault() and the App Router performs the navigation and the
     * scroll itself, asynchronously. A bubble-phase listener runs after that;
     * a one-frame window closes long before the router has got round to
     * scrolling. Capture runs first and the window is held open across it. */
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const link = (e.target as Element | null)?.closest?.('a[href*="#"]')
      if (!(link instanceof HTMLAnchorElement)) return

      let url: URL
      try { url = new URL(link.href, window.location.href) } catch { return }
      if (url.origin !== window.location.origin) return
      if (url.pathname !== window.location.pathname) return  // another page starts at the top
      const id = decodeURIComponent(url.hash.slice(1))
      const target = id ? document.getElementById(id) : null
      if (!target) return
      // Far away: leave it instant. That is fault 1 above.
      if (Math.abs(target.getBoundingClientRect().top) > TWO_SCREENS()) return

      const html = document.documentElement
      html.style.scrollBehavior = 'smooth'
      if (clear) clearTimeout(clear)
      /* Taken off again promptly, so a fling a moment later is never animated.
         1200ms covers the router's work plus the animation itself. */
      clear = setTimeout(() => { html.style.scrollBehavior = ''; clear = null }, 1200)
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      if (clear) clearTimeout(clear)
      document.documentElement.style.scrollBehavior = ''
    }
  }, [])

  return null
}
