import { LocaleLink as Link } from '@/components/LocaleLink'
import type { Metadata } from 'next'
import { Icon } from '@/components/Sprite'
import { assetUrl, getStories } from '@/lib/content'
import { PageHead } from '@/components/PageHead'
import { ContributeGate } from '@/components/ContributeGate'
import { localeAlternates, toLocale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'

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
    alternates: localeAlternates(lang, '/stories'),
    title: getDictionary(lang).meta.storiesTitle,
    description: getDictionary(lang).meta.storiesDesc,
  }
}

const ACCENTS = ['crimson', 'indigo', 'moss', 'gold'] as const

export default async function StoriesPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = toLocale((await params).lang)
  const t = getDictionary(lang)

  const stories = await getStories(lang)


  return (
    <>
      <PageHead lang={lang} path="/stories" crumb={t.pages.stories.title} icon="heart" eyebrow={t.pages.stories.eyebrow} title={t.pages.stories.title}
                back={{ href: '/#stories', label: t.pages.stories.back }}
                lede={t.pages.stories.lede} />

      <section className="section">
        <div className="container">
          <div className="grid grid--3">
            {stories.map((s, i) => {
              const photo = assetUrl('member-photos', s.photo_path)
              return (
                <figure key={s.id} className="quote reveal">
                  <div className="quote__mark" aria-hidden="true">&ldquo;</div>
                  <blockquote className="quote__text">{s.quote}</blockquote>
                  <figcaption className="quote__who">
                    <span className={`avatar avatar--${ACCENTS[i % ACCENTS.length]}`} aria-hidden="true">
                      {s.author_name.charAt(0)}
                      {photo && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img className="avatar__img" src={photo} alt="" loading="lazy" />
                      )}
                    </span>
                    <span>
                      <span className="quote__name">{s.author_name}</span><br />
                      {s.author_role && <span className="quote__role">{s.author_role}</span>}
                    </span>
                  </figcaption>
                </figure>
              )
            })}
          </div>

          {stories.length === 0 && (
            <p className="muted">{t.pages.stories.empty}</p>
          )}

          {/* Was a button pointing at the contact form, which meant a member's
              story arrived as an ordinary message and somebody had to retype it.
              It is a real submission now, and the committee approves it. */}
          <ContributeGate kind="story" />

          <div className="cluster cluster--center mt-lg">
            <Link className="btn btn--ghost" href="/#join">
              <Icon name="user-plus" /> Join the community
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
