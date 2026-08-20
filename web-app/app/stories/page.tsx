import Link from 'next/link'
import type { Metadata } from 'next'
import { Icon } from '@/components/Sprite'
import { assetUrl, getStories } from '@/lib/content'
import { PageHead } from '@/components/PageHead'
import { StoryForm, type OwnStory } from '@/components/StoryForm'
import { getCurrentMember } from '@/lib/members'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Community stories',
  description:
    'Members of the Nepali community in Oita and Beppu on arriving, settling in and '
    + 'finding people — in their own words.',
}

const ACCENTS = ['crimson', 'indigo', 'moss', 'gold'] as const

export default async function StoriesPage() {
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
      .select('id, quote, status')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
    own = (data ?? []) as OwnStory[]
  }

  return (
    <>
      <PageHead eyebrow="In their words" title="Community stories"
                back={{ href: '/#stories', label: 'Back to the stories' }}
                lede={'What members say when we ask them how the first few months went. '
                      + 'Printed as given, with their permission.'} />

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
            <p className="muted">No stories published yet.</p>
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
