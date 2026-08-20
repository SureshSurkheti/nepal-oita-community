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

      <PhotoTiles photos={shown} />

      {shown.length === 0 && (
        <p className="muted center u-mt-2">No photographs in that category yet.</p>
      )}
    </>
  )
}
