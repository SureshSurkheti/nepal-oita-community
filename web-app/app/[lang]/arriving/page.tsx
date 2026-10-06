import type { Metadata } from 'next'
import { LocaleLink as Link } from '@/components/LocaleLink'
import { Icon, type IconName } from '@/components/Sprite'
import { PageHead } from '@/components/PageHead'
import { localeAlternates, toLocale, type Locale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'
import { SITE_EMAIL, abs } from '@/lib/site'

/* "New in Oita" — the first two weeks, written down.
 *
 * WHY THIS PAGE EXISTS AT ALL
 * Every other page here answers a question somebody already thought to ask us.
 * This one answers the question they are actually typing into a search box at
 * two in the morning from a room they moved into yesterday: what do I have to
 * do, in what order, and what happens if I am late. Nothing else on this site
 * is searched for by strangers. This is, and it is the only page that can bring
 * somebody here who has never heard of the community.
 *
 * EVERY FACT ON IT IS A NATIONAL PROCEDURE, not a local detail.
 * The fourteen-day deadline, the backdated health insurance, the pension
 * exemption, the certificate you need before you can register in a new city —
 * all of that is the same in Oita as in Osaka, and all of it is checkable. What
 * is deliberately NOT here is an address, an opening time, a phone number or a
 * named shop: those go stale, nobody on the committee would notice, and a guide
 * that sends somebody to a closed counter is worse than no guide. Where a local
 * answer is needed the page says "ask us", which is both honest and the point.
 *
 * STATIC. No cookies, no database, no session — so it prerenders at build and
 * is served from the CDN. A page written to be found by strangers is the last
 * place to spend a round trip to Supabase. */
export const revalidate = 86400

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const lang = toLocale((await params).lang)
  const t = getDictionary(lang)
  return {
    alternates: localeAlternates(lang, '/arriving'),
    title: t.meta.arrivingTitle,
    description: t.meta.arrivingDesc,
  }
}

/* The numbered list, as data rather than as six copies of the same markup.
   `key` indexes the dictionary, so adding a step is one entry here and two
   dictionary blocks — and TypeScript will not let the Nepali half be forgotten. */
const STEPS = [
  { key: 's1', icon: 'shield',    accent: '' },
  { key: 's2', icon: 'pin',       accent: 'crimson', mark: true },
  { key: 's3', icon: 'heart',     accent: 'moss' },
  { key: 's4', icon: 'shield',    accent: 'indigo' },
  { key: 's5', icon: 'mail',      accent: 'gold' },
  { key: 's6', icon: 'briefcase', accent: 'indigo' },
] as const satisfies readonly { key: string; icon: IconName; accent: string; mark?: boolean }[]

const MOVING = ['m1', 'm2', 'm3'] as const

const LIFE = [
  { key: 'l1', icon: 'home',     accent: 'moss' },
  { key: 'l2', icon: 'graduate', accent: 'indigo' },
  { key: 'l3', icon: 'shield',   accent: 'crimson' },
  { key: 'l4', icon: 'star',     accent: 'gold' },
] as const satisfies readonly { key: string; icon: IconName; accent: string }[]

const WE = ['w1', 'w2', 'w3', 'w4', 'w5'] as const
const FAQ = ['1', '2', '3', '4', '5'] as const

/* FAQPage, and it is the reason the questions are marked up as <details> below
   rather than as paragraphs behind a click handler.
 *
 * Google's rule is that the answer has to be IN THE HTML and visible to a
 * crawler — an accordion that fetches or renders its answer in JavaScript is
 * ineligible, and `<details>` is the one control that collapses the text
 * without hiding it from the parser. It is also keyboard- and screen-reader-
 * complete with no code at all, which no hand-built accordion on this site
 * would have been.
 *
 * `inLanguage` is set per locale: the English and Nepali copies of this page are
 * separate URLs with separate structured data, and saying so stops the two being
 * read as one page that cannot make up its mind. */
function faqJsonLd(lang: Locale) {
  const t = getDictionary(lang).pages.arriving
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${abs(`/${lang}/arriving`)}#faq`,
    inLanguage: lang === 'ne' ? 'ne-NP' : 'en',
    mainEntity: FAQ.map((n) => ({
      '@type': 'Question',
      name: t[`q${n}` as const],
      acceptedAnswer: { '@type': 'Answer', text: t[`a${n}` as const] },
    })),
  }
}

export default async function ArrivingPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = toLocale((await params).lang)
  const t = getDictionary(lang)
  const a = t.pages.arriving

  return (
    <>
      <script type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(lang)) }} />

      <PageHead lang={lang} path="/arriving" icon="user-plus" crumb={a.eyebrow}
                eyebrow={a.eyebrow} title={a.title} lede={a.lede}
                back={{ href: '/', label: a.back }} />

      {/* ------------------------------------------------- which one are you */}
      {/* Two doors, before anything else. Somebody moving from Nagoya does not
          need the residence card explained and will stop reading if the page
          opens by explaining it — so the page opens by asking which of them is
          reading, and sends each one to their own list. */}
      <section className="section section--tight">
        <div className="container">
          <div className="doors reveal">
            <a className="door door--crimson" href="#first">
              <span className="door__plate"><Icon name="globe" /></span>
              <span className="door__text">
                <strong>{a.fromNepalTitle}</strong>
                <span>{a.fromNepalBody}</span>
              </span>
              <Icon name="arrow-right" className="icon door__go" />
            </a>
            <a className="door door--indigo" href="#moving">
              <span className="door__plate"><Icon name="network" /></span>
              <span className="door__text">
                <strong>{a.fromJapanTitle}</strong>
                <span>{a.fromJapanBody}</span>
              </span>
              <Icon name="arrow-right" className="icon door__go" />
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- the ordered list */}
      <section className="section section--tinted" id="first">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="clock" /></span>
              {a.firstEyebrow}
            </p>
            <h2 className="display-2">{a.firstTitle}</h2>
            <p className="lede">{a.firstLede}</p>
          </div>

          {/* A numbered track rather than six cards in a grid. The order IS the
              information here — a grid reflows to two columns on a tablet and
              the reading order stops being obvious, which is the one thing this
              section cannot afford. One column at every width, numbered. */}
          <ol className="track reveal">
            {STEPS.map((s, i) => (
              <li key={s.key} className={`track__step${'mark' in s && s.mark ? ' is-marked' : ''}`}>
                <span className={`track__num${s.accent ? ` track__num--${s.accent}` : ''}`}
                      aria-hidden="true">{i + 1}</span>
                <div className="track__body">
                  <h3 className="track__title">
                    <Icon name={s.icon} className="icon track__icon" />
                    {a[`${s.key}Title` as const]}
                  </h3>
                  <p className="track__text">{a[`${s.key}Body` as const]}</p>
                  <span className="track__tag">{a[`${s.key}Tag` as const]}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------- from another Japanese city */}
      <section className="section" id="moving">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="network" /></span>
              {a.movingEyebrow}
            </p>
            <h2 className="display-2">{a.movingTitle}</h2>
            <p className="lede">{a.movingLede}</p>
          </div>

          <div className="panel panel--ink reveal mx-auto measure">
            <ol className="steps">
              {MOVING.map((k) => (
                <li key={k}>
                  <div>
                    <h4>{a[`${k}Title` as const]}</h4>
                    <p>{a[`${k}Body` as const]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ living here */}
      <section className="section section--tinted">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="home" /></span>
              {a.lifeEyebrow}
            </p>
            <h2 className="display-2">{a.lifeTitle}</h2>
          </div>

          <div className="grid grid--2up">
            {LIFE.map((l) => (
              <article className="card reveal" key={l.key}>
                <div className={`plate plate--${l.accent}`}><Icon name={l.icon} /></div>
                <h3 className="card__title">{a[`${l.key}Title` as const]}</h3>
                <p className="card__body">{a[`${l.key}Body` as const]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- what we do */}
      <section className="section">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="heart" /></span>
              {a.weEyebrow}
            </p>
            <h2 className="display-2">{a.weTitle}</h2>
            <p className="lede">{a.weLede}</p>
          </div>

          <div className="panel reveal mx-auto measure">
            <ul className="benefits">
              {WE.map((k) => (
                <li key={k}><Icon name="check" /><div><h4>{a[k]}</h4></div></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- faq */}
      <section className="section section--tinted" id="faq">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="search" /></span>
              {a.faqEyebrow}
            </p>
            <h2 className="display-2">{a.faqTitle}</h2>
          </div>

          <div className="faq reveal mx-auto measure">
            {FAQ.map((n) => (
              /* Open by default, closed by CSS below the fold of the eye rather
                 than by the attribute: see the note on faqJsonLd. The answer is
                 in the HTML either way, which is what both Google and a screen
                 reader need. */
              <details className="faq__item" key={n}>
                <summary className="faq__q">
                  <span>{a[`q${n}` as const]}</span>
                  <Icon name="chevron-down" className="icon faq__chev" />
                </summary>
                <p className="faq__a">{a[`a${n}` as const]}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- cta */}
      <section className="section section--ink">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="send" /></span>
              {a.ctaTitle}
            </p>
            <h2 className="display-2">{a.ctaTitle}</h2>
            <p className="lede">{a.ctaBody}</p>
          </div>
          <div className="cluster cluster--center">
            <a className="btn btn--on-ink" href={`mailto:${SITE_EMAIL}`}>
              <Icon name="mail" /> {a.ctaButton}
            </a>
            <Link className="btn btn--ghost btn--on-ink" href="/events">
              <Icon name="calendar" /> {a.ctaEvents}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
