'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
    el.querySelectorAll<HTMLImageElement>('img').forEach((img, n) => {
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
          /* Absent, not empty. `src=""` makes the browser re-request the current
             page URL; omitting the attribute makes no request at all. */
          const load = n === 0 || armed
          const cls = ['hero__slide']
          if (ready.includes(n)) cls.push('is-loaded')
          if (n === current) cls.push('is-active')
          return (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={src}
                 className={cls.join(' ')}
                 src={load ? src : undefined}
                 alt=""
                 fetchPriority={n === 0 ? 'high' : 'low'}
                 decoding="async"
                 onLoad={() => markReady(n)}
                 onError={() => markBroken(n)} />
          )
        })}
      </div>
    </div>
  )
}
