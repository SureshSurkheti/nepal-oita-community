'use client'

import { useEffect, useRef, useState } from 'react'

/* An event's cover, which may be a photograph or a printed poster.
 *
 * These behave in opposite ways and the difference cannot be guessed from the
 * path. A photograph wants `cover`: fill the frame, crop the edges, no bars. A
 * poster wants the opposite — the Kabaddi bill is 1024x1536 and the festival
 * bill 1400x1980, so cropping either to the 21:9 banner on the event page keeps
 * a strip across the top (the sponsor logos) and throws away the title, the date
 * and everything a poster exists to say.
 *
 * So the image is asked. `naturalWidth`/`naturalHeight` are known the moment it
 * decodes, and a taller-than-wide image switches to `contain` over a blurred
 * copy of itself — the whole poster, readable, with no empty bars. Landscape
 * photographs never take that branch and are rendered exactly as before.
 *
 * Done on load rather than from the file name because it then holds for covers
 * the committee uploads later, which nobody here will have measured. */
/* How much taller than wide an image has to be before it is treated as a poster
   rather than a photograph.
   
   Not a bare height > width. One of the gallery photographs is 1079x1080 — a
   square group shot, one pixel taller than it is wide — and a bare comparison
   letterboxed it between two blurred bars for no reason. The two real posters
   are 1.50 and 1.41, so 1.15 separates them from anything merely square without
   coming close to either. */
const POSTER_RATIO = 1.15

/* naturalWidth is 0 for an image that failed, which keeps a broken one on the
   ordinary path instead of flipping it to contain. */
function isPoster(img: HTMLImageElement): boolean {
  return img.naturalWidth > 0 && img.naturalHeight / img.naturalWidth >= POSTER_RATIO
}

export function CoverImage({ src, alt, className = '', priority = false }: {
  src: string
  alt: string
  className?: string
  priority?: boolean
}) {
  const [portrait, setPortrait] = useState(false)
  const ref = useRef<HTMLImageElement>(null)

  /* onLoad ALONE IS NOT ENOUGH, and this is the whole reason there is an effect.
   *
   * The <img> is in the server-rendered HTML, so the browser starts fetching it
   * while the page is still parsing. A cached or fast image is therefore often
   * finished BEFORE React hydrates, the load event has already come and gone,
   * and the onLoad handler attached during hydration never runs — the poster
   * stays cropped. Measured: both posters rendered cropped with the handler
   * alone, which is what sent me looking.
   *
   * So the element is asked directly on mount. `complete` is true for an image
   * that has already finished, and naturalWidth is 0 if it failed, which keeps a
   * broken image on the landscape path instead of flipping it to contain. */
  useEffect(() => {
    const img = ref.current
    if (img?.complete && isPoster(img)) setPortrait(true)
  }, [src])

  return (
    <>
      {portrait && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="cover__wash" src={src} alt="" aria-hidden="true" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        className={`${className} cover__img${portrait ? ' cover__img--portrait' : ''}`}
        src={src}
        alt={alt}
        decoding="async"
        {...(priority ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
        onLoad={(e) => {
          const img = e.currentTarget
          /* Guard the zero case: a cached image can fire load with both at 0 in
             some browsers, and 0 > 0 is false, so it simply stays landscape. */
          if (isPoster(img)) setPortrait(true)
        }}
      />
    </>
  )
}
