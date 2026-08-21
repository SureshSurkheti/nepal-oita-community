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
 * A tile is a card, not a photograph with words written on it. The caption used
 * to be absolutely positioned over the foot of the frame, held legible by a
 * scrim — which works on a 280px desktop tile and does not on a 165px phone
 * one, where two lines of text cover most of the picture. So the tile is now
 * two rows: `.tile__media` holds the photograph, `.tile__caption` sits beneath
 * it on the card's own surface, and nothing is ever printed over the image at
 * any width. The scrim is gone with the need for it.
 *
 * The two-element structure is what the theme expects — `.tile` is a grid,
 * `.tile__media` supplies the aspect ratio every photograph is cropped into,
 * and the caption is the second row. If you rename any of these, add the CSS in
 * the same commit.
 *
 * The wash colour and the drawn pattern cycle by position, the way they were
 * hand-assigned on the static site: crimson/rays, indigo/wave, moss/lattice,
 * gold/dots. They show through where a photograph is missing, and now also tint
 * the hairline and the category label on the card foot, so a grid of any length
 * stays varied. */
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
              <span className="tile__media">
                <span className={`tile__art ${ART[i % 4]}`} aria-hidden="true" />
                {p.src && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="tile__img" src={p.src} alt={p.alt ?? ''}
                       loading="lazy" decoding="async" />
                )}
                <span className="tile__zoom" aria-hidden="true"><Icon name="expand" /></span>
              </span>
              <span className="tile__caption">
                {/* The CATEGORY, not the alt text. alt is a full sentence written
                    for somebody who cannot see the photograph, and a screen
                    reader would read it twice: once from the img, once from
                    here. It belongs on the img alone. */}
                {p.category && <span className="tile__caption-text">{p.category}</span>}
                <span className="tile__caption-title">{p.caption}</span>
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
