import { LocaleLink as Link } from '@/components/LocaleLink'
import type { Metadata } from 'next'
import { Icon, type IconName } from '@/components/Sprite'
import { getProgrammes } from '@/lib/content'
import { PageHead } from '@/components/PageHead'
import { localeAlternates, toLocale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'

/* FULLY PUBLIC — no session is read anywhere on this page, so it is prerendered
   and served from the CDN edge. Every visitor gets identical bytes with zero
   database work and no serverless function.

   `revalidate` is only the backstop: publishing or editing a programme calls
   updateTag, which refreshes it at once. See lib/content.ts. */
export const revalidate = 300

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const lang = toLocale((await params).lang)
  return {
    alternates: localeAlternates(lang, '/programmes'),
    title: getDictionary(lang).meta.programmesTitle,
    description: getDictionary(lang).meta.programmesDesc,
  }
}

export default async function ProgrammesPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = toLocale((await params).lang)
  const t = getDictionary(lang)

  const programmes = await getProgrammes()

  return (
    <>
      <PageHead path="/programmes" icon="star" eyebrow={t.pages.programmes.eyebrow} title={t.pages.programmes.title}
                back={{ href: '/#programmes', label: t.pages.programmes.back }}
                lede={t.pages.programmes.lede} />

      <section className="section">
        <div className="container">
          <div className="grid grid--3">
            {programmes.map((p) => (
              <article key={p.id} className={`card card--feature accent-${p.accent} reveal`}>
                <div className={`plate plate--${p.accent}`}>
                  <Icon name={p.icon as IconName} />
                </div>
                <h3 className="card__title">{p.title}</h3>
                {p.body && <p className="card__body">{p.body}</p>}
                {p.points.length > 0 && (
                  <ul className="checklist">
                    {p.points.map((t) => (
                      <li key={t}><Icon name="check" /><span>{t}</span></li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>

          <div className="cluster cluster--center mt-lg">
            <Link className="btn btn--primary" href="/#join">
              <Icon name="user-plus" /> Join the community
            </Link>
            <Link className="btn btn--ghost" href="/events">
              <Icon name="calendar" /> See what is coming up
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
