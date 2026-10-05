import type { Metadata } from 'next'
import { localeAlternates, toLocale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'
import { Gallery } from '@/components/Gallery'
import { PageHead } from '@/components/PageHead'
import { getPhotos, getMyDraftPhotos, tilePhotos } from '@/lib/content'
import { getCurrentMember } from '@/lib/members'
import { PhotoProposeForm } from '@/components/PhotoProposeForm'
import { Icon } from '@/components/Sprite'

/* Depends on who is asking, so it can never be cached or prerendered.
   This used to be inherited from the root layout's force-dynamic; the layout
   dropped it so the public pages could be served from a CDN, which means the
   viewer-specific routes have to declare it themselves. Reading cookies would
   make it dynamic anyway — saying so explicitly stops a build trying to
   prerender it, and stops a future edit quietly making it cacheable. */
export const dynamic = 'force-dynamic'

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

  const [photos, member] = await Promise.all([getPhotos(), getCurrentMember()])
  const canAdd = member !== null && (member.can_contribute || member.is_admin)
  const drafts = canAdd ? await getMyDraftPhotos() : []

  return (
    <>
      <PageHead path="/gallery" icon="images" eyebrow={t.pages.gallery.eyebrow} title={t.pages.gallery.title}
                back={{ href: '/', label: t.pages.gallery.back }}
                lede={t.pages.gallery.lede} />

      <section className="section">
        <div className="container">
          {photos.length === 0
            ? <p className="muted">{t.pages.gallery.empty}</p>
            : <Gallery photos={tilePhotos(photos)} />}

          {canAdd && (
            <div className="u-measure-center mt-lg">
              {drafts.length > 0 && (
                <div className="panel u-mb-15">
                  <h2 className="panel__title">
                    <Icon name="clock" /> {drafts.length} waiting to be published
                  </h2>
                  <ul className="roster">
                    {drafts.map((d) => (
                      <li key={d.id}>
                        <span className="avatar" aria-hidden="true"><Icon name="images" /></span>
                        <span>
                          <span className="roster__name">{d.caption ?? 'Untitled'}</span><br />
                          <span className="roster__meta">{d.category ?? 'no category'}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <PhotoProposeForm memberId={member.id} slug={member.slug} />
            </div>
          )}
        </div>
      </section>

    </>
  )
}
