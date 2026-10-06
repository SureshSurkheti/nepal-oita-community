import type { Metadata } from 'next'
import { localeAlternates, toLocale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'
import { Gallery } from '@/components/Gallery'
import { PageHead } from '@/components/PageHead'
import { getPhotos, tilePhotos } from '@/lib/content'
import { ContributeGate } from '@/components/ContributeGate'
import { Icon } from '@/components/Sprite'

/* PRERENDERED. It used to be force-dynamic because of one members-only panel
   at the foot of the page; that panel is now components/ContributeGate, which
   resolves the session in the browser. See the long note in that file — this
   page was `x-vercel-cache: MISS` for every visitor to decide whether to draw a
   form almost none of them may use. */
export const revalidate = 300

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const lang = toLocale((await params).lang)
  return {
    alternates: localeAlternates(lang, '/gallery'),
    title: getDictionary(lang).meta.galleryTitle,
    description: getDictionary(lang).meta.galleryDesc,
  }
}

export default async function GalleryPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = toLocale((await params).lang)
  const t = getDictionary(lang)

  const photos = await getPhotos(lang)

  return (
    <>
      <PageHead lang={lang} path="/gallery" icon="images" eyebrow={t.pages.gallery.eyebrow} title={t.pages.gallery.title}
                back={{ href: '/', label: t.pages.gallery.back }}
                lede={t.pages.gallery.lede} />

      <section className="section">
        <div className="container">
          {photos.length === 0
            ? <p className="muted">{t.pages.gallery.empty}</p>
            : <Gallery photos={tilePhotos(photos)} />}

          <ContributeGate kind="photo" />
        </div>
      </section>

    </>
  )
}
