import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { Icon } from '@/components/Sprite'
import { createClient } from '@/lib/supabase/server'
import { PhotoAdmin } from '@/components/PhotoAdmin'
import { assetUrl, type Photo } from '@/lib/content'

export const metadata: Metadata = { title: 'Committee — gallery', robots: { index: false } }

export default async function AdminPhotosPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data } = await supabase.from('photos').select('*').order('sort_order')
  const photos = (data ?? []) as Photo[]

  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">
            <span className="eyebrow__badge"><Icon name="shield" /></span>
            Committee only
          </p>
          <h1 className="display-2">Gallery</h1>
          <p className="lede">
            Upload a photograph and it appears in the gallery. If it came from
            somewhere else, fill in the credit — for a Creative Commons image that
            is a licence condition, not a courtesy.
          </p>
        </div>
        <PhotoAdmin
          photos={photos.map((p) => ({ ...p, url: assetUrl('site-photos', p.storage_path) }))}
        />
      </div>
    </section>
  )
}
