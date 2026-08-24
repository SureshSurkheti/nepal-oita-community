'use client'

import { useState } from 'react'
import { PhotoTiles, type TilePhoto } from './PhotoTiles'

/* The full gallery: category chips over the shared tile grid.
 *
 * Filtering is React state rather than `hidden` on DOM nodes. On the static site
 * it had to be done by hand and was silently broken for a while, because an
 * author `display` on .tile beat the browser's own [hidden] rule. */
export function Gallery({ photos }: { photos: TilePhoto[] }) {
  const categories = Array.from(new Set(photos.map((p) => p.category).filter(Boolean))) as string[]
  const [active, setActive] = useState<string>('all')

  const shown = active === 'all' ? photos : photos.filter((p) => p.category === active)

  return (
    <>
      <div className="chips">
        <button className="chip" type="button" aria-pressed={active === 'all'}
                onClick={() => setActive('all')}>
          All <span className="muted">{photos.length}</span>
        </button>
        {categories.map((c) => (
          <button key={c} className="chip" type="button" aria-pressed={active === c}
                  onClick={() => setActive(c)}>
            {c} <span className="muted">{photos.filter((p) => p.category === c).length}</span>
          </button>
        ))}
      </div>

      {/* Eight, then a button. Two rows on a four-column desktop and four rows
          on a phone, which is enough to show what the gallery is without making
          somebody scroll past a hundred photographs to reach the form below it —
          and it is eight image requests on first load instead of all of them.

          `key` on the category, so switching filters resets the control to
          collapsed. Without it, expanding "All" and then picking "festivals"
          leaves the button reading "Show fewer" over a grid that is already
          showing everything it has. */}
      <PhotoTiles key={active} photos={shown} cap={8} id="gallery-tiles" />

      {shown.length === 0 && (
        <p className="muted center u-mt-2">No photographs in that category yet.</p>
      )}
    </>
  )
}
