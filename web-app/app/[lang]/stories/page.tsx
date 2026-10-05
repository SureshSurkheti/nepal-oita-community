import { LocaleLink as Link } from '@/components/LocaleLink'
import type { Metadata } from 'next'
import { Icon } from '@/components/Sprite'
import { assetUrl, getStories } from '@/lib/content'
import { PageHead } from '@/components/PageHead'
import { StoryForm, type OwnStory } from '@/components/StoryForm'
import { getCurrentMember } from '@/lib/members'
import { createClient } from '@/lib/supabase/server'
import { localeAlternates, toLocale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'

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
    alternates: localeAlternates(lang, '/stories'),
    title: getDictionary(lang).meta.storiesTitle,
    description: getDictionary(lang).meta.storiesDesc,
  }
}

const ACCENTS = ['crimson', 'indigo', 'moss', 'gold'] as const

export default async function StoriesPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = toLocale((await params).lang)
  const t = getDictionary(lang)

  const [stories, member] = await Promise.all([getStories(), getCurrentMember()])

  /* Their own submissions, whatever state those are in. stories_read_own exists
     precisely so this query returns a pending row: without it a member submits
     a story, it vanishes, and they submit it again. Not wrapped in unwrap() —
     for a visitor this is expected to come back empty, and an empty list is the
     correct answer rather than an error. */
  let own: OwnStory[] = []
  if (member) {
    const supabase = await createClient()
    const { data } = await supabase.from('stories')
      .select('id, quote, author_role, status')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
    own = (data ?? []) as OwnStory[]
  }

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
          <div className="mt-lg u-measure-center">
            <StoryForm
              member={member && {
                id: member.id, name: member.name,
                role: member.role, photo_path: member.photo_path,
              }}
              own={own}
            />
          </div>

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
