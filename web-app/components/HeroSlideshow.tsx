'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import NextImage from 'next/image'

/* The homepage hero, as photographs that cross-fade into one another.
 *
 * THE LOADING STRATEGY IS THE WHOLE DESIGN
 * A five-photograph hero done naively is one of the most effective ways there is
 * to ruin a site's page speed, and page speed is a ranking factor. All five would
 * be inside the viewport from the first paint, so `loading="lazy"` does nothing —
 * the browser fetches every one immediately, and the photograph the visitor is
 * actually looking at has to queue behind four they will not see for seven
 * seconds. On this site that would mean roughly 3.4MB competing for the same
 * connection instead of 2.9MB on its own.
 *
 * So the later slides have no `src` at all until the page has finished loading.
 * Only slide one is in the markup the server sends, with `fetchPriority="high"`;
 * the rest are given their source about half a second after `window.load`, decode
 * quietly in the background, and the rotation starts once there is a second
 * photograph ready to fade to. First paint is byte-for-byte what it was before
 * this component existed.
 *
 * REDUCED MOTION MEANS NO ROTATION AT ALL
 * Not a faster fade — none. Somebody who has asked their operating system to stop
 * things moving is telling you that movement is a problem, and a background that
 * changes under the text they are reading is exactly the problem. They get slide
 * one, and the other four are never fetched. That also serves as the "pause"
 * mechanism a continuously changing element is expected to offer, which is how
 * the drift animation already on this photograph is handled.
 *
 * EVERY SLIDE GOES THROUGH next/image, AND THAT IS A SIZE DECISION
 * The sources are 1536x1024 and 1920x1279 — right for a full-bleed hero on a
 * desktop, and four times what a 393px phone can use. Measured on the live home
 * page over Slow 4G: best.webp alone was 257KB and the first slide is
 * fetchPriority high, so it competed directly with the thing the page is judged
 * on. `sizes="100vw"` is honest here — the hero really is the full width — so
 * the browser is handed a srcset and takes a phone-sized copy on a phone and the
 * big one on a desktop.
 *
 * The staging survives the change: slide one still renders with `priority`
 * (which emits a preload link, better than fetchPriority alone), and the rest
 * are not rendered AT ALL until `armed`, so no request is made for them.
 *
 * LOAD IS BOTH LISTENED FOR AND CHECKED
 * A cached photograph can finish decoding before React has attached its onLoad
 * handler, and then the handler never fires and the slide stays invisible for
 * ever. So every slide is also tested with `img.complete` on mount. This is the
 * same trap SiteMotion documents for the images it watches; it is easy to write
 * this component without the second half and see nothing wrong until a reload.
 */
export function HeroSlideshow({ images, interval = 7000 }: {
  /** Ordered. The first is the one the server sends and the only one that
   *  affects Largest Contentful Paint, so it should be the composed hero shot. */
  images: string[]
  interval?: number
}) {
  const cell = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const [armed, setArmed] = useState(false)
  const [ready, setReady] = useState<number[]>([])
  const [broken, setBroken] = useState<number[]>([])

  const markReady = useCallback((n: number) => {
    setReady((r) => (r.includes(n) ? r : [...r, n]))
  }, [])
  const markBroken = useCallback((n: number) => {
    setBroken((b) => (b.includes(n) ? b : [...b, n]))
  }, [])

  /* Give the later slides their source, once the page is done. */
  useEffect(() => {
    if (images.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let timer = 0
    const arm = () => { timer = window.setTimeout(() => setArmed(true), 600) }
    if (document.readyState === 'complete') arm()
    else window.addEventListener('load', arm, { once: true })

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('load', arm)
    }
  }, [images.length])

  /* Catch anything that decoded before React was listening. Re-run when the
     later slides are armed, because that is when four more sources appear. */
  useEffect(() => {
    const el = cell.current
    if (!el) return
    el.querySelectorAll<HTMLImageElement>('img[data-slide]').forEach((img) => {
      const n = Number(img.dataset.slide)
      if (!Number.isInteger(n)) return
      if (img.getAttribute('src') && img.complete) {
        if (img.naturalWidth > 0) markReady(n)
        else markBroken(n)
      }
    })
  }, [armed, markReady, markBroken])

  /* Advance. Only ever to a slide that has actually decoded — fading to a
     photograph that has not arrived yet shows the sky gradient underneath, which
     reads as the page breaking rather than as a transition. */
  useEffect(() => {
    if (!armed) return
    const usable = images.map((_, n) => n).filter((n) => ready.includes(n) && !broken.includes(n))
    if (usable.length < 2) return

    const id = window.setInterval(() => {
      /* Skipped while the tab is in the background. Browsers throttle timers
         there rather than stopping them, so without this you come back to a
         queue of transitions firing at once. */
      if (document.visibilityState !== 'visible') return
      setCurrent((n) => {
        const at = usable.indexOf(n)
        return usable[(at + 1) % usable.length] ?? usable[0]
      })
    }, interval)
    return () => window.clearInterval(id)
  }, [armed, images, ready, broken, interval])

  return (
    <div className="hero__grid">
      <div className="hero__cell" ref={cell}>
        {images.map((src, n) => {
          const load = n === 0 || armed
          const cls = ['hero__slide']
          if (ready.includes(n)) cls.push('is-loaded')
          if (n === current) cls.push('is-active')

          /* NOT RENDERED AT ALL until it is armed. The old version kept the
             <img> and left `src` off, because `src=""` makes a browser
             re-request the current page. next/image requires a src, and simply
             leaving the element out is cleaner than either: no element, no
             request, and nothing to reason about. */
          if (!load) return <span key={src} className={cls.join(' ')} aria-hidden="true" />

          return (
            <NextImage key={src}
                       /* Indexed by attribute, NOT by position in the NodeList.
                          The sweep below used querySelectorAll('img') and the
                          element's index — which was correct only while every
                          slide was always an <img>. Now the unarmed ones are
                          spans, so the indices would silently shift and the
                          wrong slide would be marked ready. */
                       data-slide={n}
                       className={cls.join(' ')}
                       src={src}
                       alt=""
                       fill
                       sizes="100vw"
                       priority={n === 0}
                       onLoad={() => markReady(n)}
                       onError={() => markBroken(n)} />
          )
        })}
      </div>
    </div>
  )
}
