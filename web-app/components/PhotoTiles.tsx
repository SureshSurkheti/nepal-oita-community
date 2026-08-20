'use client'

import { useCallback, useEffect, useState } from 'react'
import { Icon } from './Sprite'

/* Deliberately not `Photo` from lib/content: that module imports the server
   Supabase client, which reaches for `next/headers`. Nor a `urlFor` callback
   prop — a function cannot cross the server/client boundary at all, and the
   version of this that took one would have thrown the moment a photograph
   existed to render. The URL is resolved on the server and passed as a string. */
export type TilePhoto = {
  id: string
  src: string | null
  caption: string | null
  alt: string | null
  category?: string | null
  credit: string | null
  credit_url: string | null
  licence: string | null
  licence_url: string | null
}

/* The tile grid and its lightbox, shared by the homepage preview and the full
 * gallery page.
 *
 * The tile's internals are not interchangeable with anything simpler: the theme
 * positions `.tile__caption` absolutely and styles `.tile__caption-title` and
 * `.tile__caption-text` as two separate lines inside it. An earlier version of
 * this markup used a `.tile__cap` wrapper that has no rule anywhere in
 * theme.css, so the captions rendered as unstyled inline text sitting under the
 * photograph. If you rename any of these, add the CSS in the same commit.
 *
 * The wash colour and the drawn pattern cycle by position, the way they were
 * hand-assigned on the static site: crimson/rays, indigo/wave, moss/lattice,
 * gold/dots. They show through where a photograph is missing, and tint the one
 * that is there, so a grid of any length stays varied. */
const WASH = ['crimson', 'indigo', 'moss', 'gold']
const ART = ['art-rays', 'art-wave', 'art-lattice', 'art-dots']

export function PhotoTiles({ photos }: { photos: TilePhoto[] }) {
  const [open, setOpen] = useState<number | null>(null)

  const move = useCallback((delta: number) => {
    setOpen((i) => (i === null ? null : (i + delta + photos.length) % photos.length))
  }, [photos.length])

  /* If the filter above changes under us, an index into the old list is
     meaningless — close rather than show the wrong photograph. */
  useEffect(() => { setOpen(null) }, [photos])

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') move(1)
      if (e.key === 'ArrowLeft') move(-1)
    }
    document.addEventListener('keydown', onKey)
    // Stop the page behind scrolling while the viewer is up.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, move])

  const current = open === null ? null : photos[open]

  return (
    <>
      <div className="tiles tiles--4">
        {photos.map((p, i) => {
          return (
            <button key={p.id} type="button"
                    className={`tile tile--${WASH[i % 4]} reveal reveal--zoom`}
                    onClick={() => setOpen(i)}
                    aria-label={`View ${p.caption ?? 'photograph'}`}>
              <span className={`tile__art ${ART[i % 4]}`} aria-hidden="true" />
              {p.src && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img className="tile__img" src={p.src} alt={p.alt ?? ''}
                     loading="lazy" decoding="async" />
              )}
              <span className="tile__scrim" aria-hidden="true" />
              <span className="tile__zoom" aria-hidden="true"><Icon name="expand" /></span>
              <span className="tile__caption">
                <span className="tile__caption-title">{p.caption}</span>
                {p.alt && <span className="tile__caption-text">{p.alt}</span>}
              </span>
            </button>
          )
        })}
      </div>

      {current && (
        <div className="lightbox" role="dialog" aria-modal="true"
             aria-label={current.caption ?? 'Photograph'}>
          <div className="lightbox__stage" onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(null)
          }}>
            <button className="lightbox__btn lightbox__btn--close" type="button"
                    aria-label="Close viewer" onClick={() => setOpen(null)}>
              <Icon name="close" />
            </button>
            <button className="lightbox__btn lightbox__btn--prev" type="button"
                    aria-label="Previous" onClick={() => move(-1)}>
              <Icon name="chevron-left" />
            </button>
            <button className="lightbox__btn lightbox__btn--next" type="button"
                    aria-label="Next" onClick={() => move(1)}>
              <Icon name="chevron-right" />
            </button>
            <div className="lightbox__frame">
              {current.src && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={current.src} alt={current.alt ?? ''} />
              )}
            </div>
            <div className="lightbox__cap">
              <h3>{current.caption}</h3>
            </div>
            <p className="lightbox__count">{open! + 1} / {photos.length}</p>
          </div>
        </div>
      )}
    </>
  )
}
