import Link from 'next/link'
import type { Metadata } from 'next'
import { Icon, type IconName } from '@/components/Sprite'
import { getProgrammes } from '@/lib/content'
import { PageHead } from '@/components/PageHead'

export const metadata: Metadata = {
  title: 'What we do',
  description:
    'Everything the Nepal–Oita Community runs: festivals, newcomer support, Nepali '
    + 'language classes, sport, volunteering and help when something goes wrong.',
}

export default async function ProgrammesPage() {
  const programmes = await getProgrammes()

  return (
    <>
      <PageHead icon="star" eyebrow="What we do" title="Everything we run"
                back={{ href: '/#programmes', label: 'Back to what we do' }}
                lede={'The short list on the homepage is the first row of this one. '
                      + 'Nothing here is aspirational — every item below has happened, '
                      + 'most of it more than once.'} />

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
