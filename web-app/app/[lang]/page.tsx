import { LocaleLink as Link } from '@/components/LocaleLink'
import type { Metadata } from 'next'
import { Icon, type IconName } from '@/components/Sprite'
import { CountUp } from '@/components/CountUp'
import { EventCard } from '@/components/EventCard'
import { EventsRail } from '@/components/EventsRail'
import { DecisionsPager } from '@/components/DecisionsPager'
import { MeetingEditor } from '@/components/MeetingEditor'
import { ShowMore } from '@/components/ShowMore'
import { PersonCard } from '@/components/PersonCard'
import { ContactForm } from '@/components/ContactForm'
import { HeroBody } from '@/components/HeroBody'
import { HeroSlideshow } from '@/components/HeroSlideshow'
import { HomeMinutes } from '@/components/HomeMinutes'
import { WelcomeNote } from '@/components/WelcomeNote'
import { EventSpotlight, type SpotlightEvent } from '@/components/EventSpotlight'
import { HERO_PHOTOS } from '@/lib/covers'
import { PhotoTiles } from '@/components/PhotoTiles'
import { getPublicMembers } from '@/lib/members'
import { assetUrl, chipDate, coverFor, daysUntil, getEvents, getProgrammes, getPhotos, getStories, longDate, tilePhotos, todayInJapan } from '@/lib/content'
import { localeAlternates, toLocale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'

/* PRERENDERED, and kept that way on purpose.
   
   `revalidate` is the backstop; publishing an event or a photograph calls
   updateTag, which refreshes this at once. If a future edit makes this page read
   the request again — getCurrentMember(), cookies(), headers() — Next will turn
   it back into a per-request render silently, and the only visible symptom is
   `x-vercel-cache: MISS`. Check that header after touching this file. */
export const revalidate = 300


/* The hero numbers.
 *
 * Three are the committee's own figures, given directly, and they describe the
 * community rather than the website: 50+ on the register, 100+ events run since
 * 2019, 20+ things we do. The site itself only lists a subset of any of them —
 * the register here is however many people have been added at /admin/members,
 * which is smaller — so these are a claim about the organisation, which is the
 * committee's to make and not the database's.
 *
 * They had briefly been `.length` of the tables. That was more defensible and
 * less true: "19 on the register" describes how much of the register has been
 * typed in, not how many members there are.
 *
 * THE ONE THAT IS NOT A CLAIM is the years, which is arithmetic on the founding
 * year and needs no maintenance. The other three do: if the register passes 100,
 * somebody has to change the number here. */
const FOUNDED = 2019

/* THE RULE FOR EVERY NUMBER ON THIS PAGE: either a visitor can count it on the
   site, or its label says what period it covers. Nothing else.
   
   That rule exists because the page used to break it in both directions at once.
   It said 100+ members over a strip claiming 500 students — two figures that
   cannot both be true, on one screen. Then it said 13 on the register above
   nineteen member cards, which is the same fault the other way: claiming less
   than you can see just reads as a mistake.
   
   So all four figures now move on their own. Three are counted straight from
   what is rendered. The fourth adds the events in the database to a baseline of
   the ones run before the site existed — a history the site cannot show, which
   is why its label carries the period. Nothing here needs editing as the
   community grows.

   That label used to be a FOUNDED_LABEL constant here. It is now
   home.stats.events in both dictionaries — one place per language, and editing
   it here would have changed nothing on the page. */

/* Events run before the site started keeping the list. The figure on the page is
   this PLUS however many events are in the database, so adding one at
   /admin/events raises it and deleting one lowers it — no file to edit.
   
   ONE ASSUMPTION WORTH CHECKING: that these 100 do NOT already include the events
   the site lists. If 100 was meant as "everything we have ever run, the ones on
   the site included", then those are being counted twice and this should come
   down by however many that is. One number, one place, either way. */
const EVENTS_BEFORE_THE_SITE = 100

const AUDIENCES: { icon: IconName; accent: string; key: 'students' | 'workers' | 'families' | 'neighbours' }[] = [
  { icon: 'graduate', accent: 'indigo', key: 'students' },
  { icon: 'briefcase', accent: 'moss', key: 'workers' },
  { icon: 'home', accent: 'gold', key: 'families' },
  { icon: 'globe', accent: '', key: 'neighbours' },
]

/* The two homes, as the theme lays them out: one group per country, each a wide
   photograph over two square ones. The wide one is first in each group because
   `.place--wide` spans both columns of `.places__grid`. */
const PLACES = [
  {
    key: 'nepal' as const,
    reveal: 'reveal--left',
    photos: [
      { file: 'place-everest.jpg', wide: true, name: 'Sagarmatha', where: 'Everest and Nuptse, above the Khumbu Glacier',
        alt: 'Mount Everest and Nuptse rising above the Khumbu Glacier' },
      { file: 'place-amadablam.jpg', wide: false, name: 'Ama Dablam', where: 'Khumbu',
        alt: 'The peak of Ama Dablam in the Nepal Himalaya' },
      { file: 'place-boudhanath.jpg', wide: false, name: 'Boudhanath', where: 'Kathmandu',
        alt: 'Prayer flags strung from the gilded spire of Boudhanath stupa, Kathmandu' },
    ],
  },
  {
    key: 'oita' as const,
    reveal: 'reveal--right',
    photos: [
      { file: 'place-umijigoku.jpg', wide: true, name: 'Umi Jigoku', where: 'The steaming pools of Beppu',
        alt: 'Steam rising from the turquoise pool of Umi Jigoku in Beppu, with a red torii behind' },
      { file: 'city-view.webp', wide: false, name: 'Beppu and Oita City View', where: 'Usa',
        alt: 'City view in northern Oita city and Beppu city' },
      { file: 'place-sakura.jpg', wide: false, name: 'Ono River', where: 'Cherry blossom, April',
        alt: 'A row of cherry blossom trees along the bank of the Ono River in Oita' },
    ],
  },
]

const BENEFITS = ['free', 'emergency', 'jobs', 'chats', 'vote'] as const

/* The follower counts sit on the links, not in a strip of abstract figures
   further up the page.
   
   That is the whole reason they are safe to publish. "500 students" was a number
   nobody could check and nobody could source; "5,000+ followers" is one click
   from being verified by whoever doubts it, because the link is right there. A
   number you can check is worth more than a bigger one you cannot.
   
   All three are shown, including YouTube's 65. I had left that one off on the
   grounds that it reads small beside 5,000 — but a page that publishes the two
   flattering numbers and quietly hides the third is doing something a reader can
   smell, and 65 people who subscribed to watch a community's festivals in full
   is not a number to be embarrassed by. Labelled subscribers, which is what
   YouTube calls them. */
const SOCIALS: { modifier: string; icon: IconName; href: string; label: string
                 metaKey: 'facebookMeta' | 'youtubeMeta' | 'tiktokMeta' | 'emailMeta' }[] = [
  { modifier: 'facebook', icon: 'facebook', href: 'https://www.facebook.com/nepaloitacommunity98',
    label: 'Facebook', metaKey: 'facebookMeta' },
  { modifier: 'youtube', icon: 'youtube', href: 'https://www.youtube.com/@namastejapan-o2u',
    label: 'YouTube — Namaste Japan', metaKey: 'youtubeMeta' },
  { modifier: 'tiktok', icon: 'tiktok', href: 'https://www.tiktok.com/@prayas03?_r=1&_t=ZS-992i3ERvHan',
    label: 'TikTok — Namaste Japan', metaKey: 'tiktokMeta' },
  { modifier: 'email', icon: 'mail', href: 'mailto:nepaloitacommunity11@gmail.com',
    label: 'nepaloitacommunity11@gmail.com', metaKey: 'emailMeta' },
]

/* ONE RULE FOR EVERY SECTION HEAD ON THIS PAGE: centred.
 *
 * It used to be six centred and four left, inherited from the static site, and
 * the split followed nothing a reader could pick up — About centred, Programmes
 * left, Places centred, Events and Gallery left. Alignment that carries no
 * meaning is just a page that zig-zags.
 *
 * Centred is the right single answer here rather than left, because everything
 * BELOW these headings is symmetric and full-width: card grids, the events rail,
 * the photo tiles, the people grids. A left-aligned heading over a balanced grid
 * puts the heading's weight off to one side of content that is not — which is
 * the exact imbalance that showed up on the minutes card and started this.
 *
 * Left alignment is still right in two places and they are deliberately left
 * alone: PageHead, which is a page title in a photographic hero with a back
 * link, and the committee tools, which are working screens rather than a front
 * page. */
/* The home page's own title, not the layout default, and deliberately not run
   through the `%s | Nepal–Oita Community` template — it would repeat the name.
   Written for what people type: "nepali community oita" and "nepali in beppu"
   are the searches this page has to answer. */
export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const lang = toLocale((await params).lang)
  return {
    alternates: localeAlternates(lang, '/'),
    title: { absolute: 'Nepal–Oita Community — Nepali community in Oita and Beppu, Japan' },
  }
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const lang = toLocale((await params).lang)
  const t = getDictionary(lang)

  /* NOTHING HERE READS THE REQUEST, and that is what makes this page fast.
     
     It used to call getCurrentMember() and then getMembers() — both of which
     read cookies — so the whole route was dynamic: `x-vercel-cache: MISS` on
     every request, seven database queries per view, and 2.6s to first byte on a
     cold start, while /programmes answered HIT in 0.45s. Two things were
     responsible and both have moved:
     
       the minutes   -> components/HomeMinutes, fetched in the browser
       the register  -> getPublicMembers(), which has no cookie jar and never
                        asks for a phone number
     
     All five fetchers below go through createPublicClient() and unstable_cache,
     so this page is prerendered and served from the edge. */
  const [members, events, programmes, stories, photos] = await Promise.all([
    getPublicMembers(), getEvents(lang), getProgrammes(lang), getStories(lang), getPhotos(lang),
  ])

  const past = events.filter((e) => e.past)
  const upcoming = events.filter((e) => !e.past)
  const orderedEvents = [...past, ...upcoming]

  /* What the band under the hero announces, and what its full-screen view walks
     through. Trimmed to the fields that view uses — `body`, the long write-up on
     the event's own page, is deliberately dropped: this list is serialised into
     the home page's HTML, and carrying a write-up nobody has opened yet would be
     the largest thing in it.

     `days` is computed HERE, on the server, against the date in Oita. Working it
     out inside the component would read the viewer's own clock and tear the text
     on hydration for anybody whose phone disagrees by an hour. */
  const spotlight: SpotlightEvent[] = upcoming.map((e) => {
    const { month, day } = chipDate(e.event_date)
    return {
      slug: e.slug, title: e.title, summary: e.summary,
      dateLabel: longDate(e.event_date), month, day,
      start_time: e.start_time, end_time: e.end_time,
      place: e.place, category: e.category, accent: e.accent,
      cover: coverFor(e.slug, e.cover_path),
      highlights: e.highlights, past: e.past,
      days: daysUntil(e.event_date),
    }
  })

  /* Counted here, where the data already is. `todayInJapan()` rather than the
     server's own clock: the site's year is Oita's year, and a box in another
     timezone would tick the count over on the wrong day. */
  /* The individual things listed under the programmes, not the number of
     programme cards. Six cards is a thin-sounding number for a community that
     runs eighteen distinct activities, and eighteen is the figure somebody can
     actually count on /programmes. Add two more points there and this reads 20
     on its own. */
  const thingsWeDo = programmes.reduce((n, p) => n + p.points.length, 0)

  /* Each figure links to the section it is counting. The page already scrolls
     smoothly (`data-scroll-behavior` on <html>) and every section carries
     `scroll-margin-top`, so an ordinary anchor lands the heading clear of the
     fixed navbar — no scroll handler needed.
     
     "Years active" has no href because there is no section that answers it; a
     link that went somewhere approximate would be worse than a number that
     simply sits there. */
  const stats = [
    { to: members.length, suffix: '', label: t.home.stats.register, href: '#members' },
    { to: EVENTS_BEFORE_THE_SITE + events.length, suffix: '', label: t.home.stats.events, href: '#events' },
    { to: thingsWeDo, suffix: '', label: t.home.stats.things, href: '#programmes' },
    /* `todayInJapan()` rather than the server's own clock: the site's year is
       Oita's year, and a box in another timezone would tick this over a day
       early or late. */
    { to: Number(todayInJapan().slice(0, 4)) - FOUNDED, suffix: '', label: t.home.stats.years, href: null },
  ]

  const leadership = members.filter((m) => m.category === 'leadership')
  const general = members.filter((m) => m.category === 'general')

  return (
    <>
      <HeroBody />

      {/* ---------------------------------------------------------------- hero */}
      <section className="hero" id="home">
        {/* aria-hidden, so none of these photographs is announced and none needs
            alt text — the hero's meaning is entirely in the words on top of it.
            HERO_PHOTOS is ordered: the first is what the server sends and the only
            one that counts toward Largest Contentful Paint, so it stays the
            composed shot. The other four are fetched after the page has loaded.
            See components/HeroSlideshow.tsx. */}
        <div className="hero__art" aria-hidden="true">
          <HeroSlideshow images={HERO_PHOTOS} />
        </div>

        <div className="container hero__content">
          <p className="eyebrow eyebrow--center hero__eyebrow">
            <span className="deva" lang="ne">नेपाल</span> &nbsp;·&nbsp;{' '}
            <span className="jp" lang="ja">おおいた</span> &nbsp;·&nbsp; {t.home.hero.est}
          </p>
          <h1 className="display-1 hero__title">
            {lang === 'ne'
              ? <>{t.home.hero.titleB} <em>{t.home.hero.oita}</em>{t.home.hero.titleC}<br />{t.home.hero.titleA}</>
              : <>{t.home.hero.titleA}<br />{t.home.hero.titleB} <em>{t.home.hero.oita}</em>, {t.home.hero.titleC}</>}
          </h1>
          {/* From the dictionary, not inline. It was a hardcoded English
              sentence — the most prominent line on the site after the headline
              itself — so the Nepali homepage announced the community in English
              underneath a Nepali headline. */}
          <p className="lede hero__lede">{t.home.hero.lede}</p>
          <div className="hero__actions">
            <Link className="btn btn--primary" href="#join">
              <Icon name="user-plus" /> Join our community
            </Link>
            <Link className="btn btn--indigo" href="#events">
              <Icon name="calendar" /> Upcoming events
            </Link>
          </div>
        </div>

        <div className="container hero__stats">
          {/* ABOVE THE STATISTICS, INSIDE THE FIRST SCREEN.
              This sat below the hero until it was pointed out that nobody saw
              it: the hero is min-height 100svh, so a band underneath begins
              exactly one screen down and only exists for people who scroll. The
              figures say who the community is; this says what it is doing next,
              and that is the more perishable of the two. */}
          <EventSpotlight events={spotlight} />
          <a className="hero__scroll" href="#about">
            <span className="hero__scroll-txt">{t.home.hero.scroll}</span>
            <Icon name="chevron-down" className="icon hero__scroll-chev" />
          </a>
          <div className="statbar">
            {stats.map((s) => {
              const inner = (
                <>
                  <CountUp to={s.to} suffix={s.suffix} />
                  <div className="stat__label">{s.label}</div>
                </>
              )
              return s.href ? (
                <a className="stat stat--link" href={s.href} key={s.label}>{inner}</a>
              ) : (
                <div className="stat" key={s.label}>{inner}</div>
              )
            })}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- about */}
      <section className="section" id="about">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="users" /></span>
              {t.home.about.eyebrow}
            </p>
            <h2 className="display-2">{t.home.about.title}</h2>
            <p className="lede">
              {t.home.about.lede}
            </p>
          </div>

          <div className="grid grid--4">
            {AUDIENCES.map((a) => (
              <article className="card reveal" key={a.key}>
                <div className={a.accent ? `plate plate--${a.accent}` : 'plate'}>
                  <Icon name={a.icon} />
                </div>
                <h3 className="card__title">{t.home.audiences[`${a.key}Title`]}</h3>
                <p className="card__body">{t.home.audiences[`${a.key}Body`]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ a word from the office */}
      {/* Renders nothing until somebody on the committee has actually written
          one — see the note in WelcomeNote. The site ships with no band. */}
      <WelcomeNote members={members} lang={lang} t={t.home.welcome} />

      {/* ------------------------------------------------------ new in Oita */}
      {/* The one block on this page aimed at somebody who has never heard of us.
          It sits directly under "Everyone who calls Oita home" because that
          section makes a promise and this is the first page that keeps it. */}
      <section className="section section--tight">
        <div className="container">
          <div className="newcomer reveal">
            <div>
              <p className="eyebrow">
                <span className="eyebrow__badge"><Icon name="user-plus" /></span>
                {t.home.newcomer.eyebrow}
              </p>
              <h2 className="newcomer__title">{t.home.newcomer.title}</h2>
              <p className="newcomer__lede">{t.home.newcomer.lede}</p>
              <Link className="btn btn--primary" href="/arriving">
                <Icon name="arrow-right" /> {t.home.newcomer.cta}
              </Link>
            </div>
            <ul className="newcomer__points">
              <li><Icon name="check" /><span>{t.home.newcomer.p1}</span></li>
              <li><Icon name="check" /><span>{t.home.newcomer.p2}</span></li>
              <li><Icon name="check" /><span>{t.home.newcomer.p3}</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- programmes */}
      <section className="section" id="programmes">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="star" /></span>
              {t.home.programmes.eyebrow}
            </p>
            <h2 className="display-2">{t.home.programmes.title}</h2>
            <p className="lede">
              {t.home.programmes.lede}
            </p>
          </div>

          <ShowMore className="grid grid--3" id="programmes-grid" href="/programmes">
            {programmes.map((p) => (
              <article key={p.id}
                       className={`card card--feature${p.accent === 'crimson' ? '' : ` accent-${p.accent}`} reveal`}>
                <div className={p.accent === 'crimson' ? 'plate' : `plate plate--${p.accent}`}>
                  <Icon name={p.icon as IconName} />
                </div>
                <h3 className="card__title">{p.title}</h3>
                {p.body && <p className="card__body">{p.body}</p>}
                {p.points.length > 0 && (
                  <ul className="checklist">
                    {p.points.map((t) => <li key={t}><Icon name="check" /><span>{t}</span></li>)}
                  </ul>
                )}
              </article>
            ))}
          </ShowMore>
        </div>
      </section>

      {/* -------------------------------------------------------------- places */}
      <section className="section section--ink" id="places">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="globe" /></span>
              {t.home.places.eyebrow}
            </p>
            <h2 className="display-2">{t.home.places.title}</h2>
            <p className="lede">
              {t.home.places.lede}
            </p>
          </div>

          <div className="places">
            {PLACES.map((group, gi) => (
              <div className={`places__group reveal ${group.reveal}`} key={gi}>
                {/* The native-script word is the design, not a translation. For Nepal
                    it IS the Nepali name, so on the Nepali site it stands alone rather
                    than being followed by itself; おおいた is Japanese, foreign to both
                    languages, so the local name always follows it. */}
                <h3 className="places__label">
                  {group.key === 'nepal' ? (
                    <>
                      <span className="deva" lang="ne">नेपाल</span>
                      {lang === 'en' && <> {t.home.places.nepal}</>}
                    </>
                  ) : (
                    <>
                      <span className="jp" lang="ja">おおいた</span> {t.home.places.oita}
                    </>
                  )}
                </h3>
                <div className="places__grid">
                  {group.photos.map((p) => (
                    <figure className={p.wide ? 'place place--wide' : 'place'} key={p.file}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/images/${p.file}`} alt={p.alt} loading="lazy" decoding="async" />
                      <span className="place__scrim" aria-hidden="true" />
                      <figcaption>
                        <strong>{p.name}</strong><span>{p.where}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- events */}
      <section className="section" id="events">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="calendar" /></span>
              {t.home.events.eyebrow}
            </p>
            <h2 className="display-2">{t.home.events.title}</h2>
            <p className="lede">
              {t.home.events.lede}
            </p>
          </div>

          {orderedEvents.length === 0 ? (
            <p className="muted">
              {t.home.events.empty}
            </p>
          ) : (
            <EventsRail pastCount={past.length}
                        upcomingIndex={upcoming.length > 0 ? past.length : -1}>
              {orderedEvents.map((e, i) => <EventCard key={e.id} event={e} index={i} lang={lang} />)}
            </EventsRail>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- gallery */}
      {photos.length > 0 && (
        <section className="section section--tinted" id="gallery">
          <div className="container">
            <div className="section-head section-head--center reveal">
              <p className="eyebrow eyebrow--center">
                <span className="eyebrow__badge"><Icon name="images" /></span>
                {t.home.gallery.eyebrow}
              </p>
              <h2 className="display-2">{t.home.gallery.title}</h2>
              <p className="lede">
                {t.home.gallery.lede}
              </p>
            </div>

            {/* Eight, which is two full rows on a desktop and four on a phone.
                It was four — one row — and one row of a gallery reads as a
                placeholder rather than as a gallery. Sliced here rather than
                capped with ShowMore: the control below is a LINK to the full
                page, so there is nothing on this page for an expand button to
                reveal, and sending only eight photographs' worth of markup and
                image requests is the point of a preview. */}
            <PhotoTiles photos={tilePhotos(photos.slice(0, 8))} />

            <div className="cluster cluster--center mt-lg">
              <Link className="btn btn--ghost" href="/gallery">
                <Icon name="images" /> {t.home.gallery.viewAll}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- stories */}
      {stories.length > 0 && (
        <section className="section" id="stories">
          <div className="container">
            <div className="section-head section-head--center reveal">
              <p className="eyebrow eyebrow--center">
                <span className="eyebrow__badge"><Icon name="heart" /></span>
                {t.home.stories.eyebrow}
              </p>
              <h2 className="display-2">{t.home.stories.title}</h2>
            </div>
            <ShowMore className="grid grid--3" id="stories-grid" href="/stories">
              {stories.map((s, i) => {
                const photo = assetUrl('member-photos', s.photo_path)
                const accents = ['crimson', 'indigo', 'moss', 'gold']
                return (
                  <figure key={s.id} className="quote reveal">
                    <div className="quote__mark" aria-hidden="true">&ldquo;</div>
                    <blockquote className="quote__text">{s.quote}</blockquote>
                    <figcaption className="quote__who">
                      <span className={`avatar avatar--${accents[i % 4]}`} aria-hidden="true">
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
            </ShowMore>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- decisions */}
      {/* The committee's write-ups, fetched in the BROWSER rather than here.
          It is the members-only section that used to make this whole route
          dynamic — see the note at the top of components/HomeMinutes. */}
      <HomeMinutes />

      {/* ------------------------------------------------------------- members */}
      <section className="section section--tinted" id="members">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="network" /></span>
              {t.home.members.eyebrow}
            </p>
            {/* Was "Six hundred neighbours", over a strip of four invented
                figures. Six hundred is not a number anybody here could stand
                behind, and it sat directly above the register that shows how many
                there actually are. This heading says what the section is and
                carries the words people search for, which the old one did not. */}
            <h2 className="display-2">{t.home.members.title}</h2>
            <p className="lede">
              {t.home.members.lede}
            </p>
          </div>

          {/* A first row of each, and a "See all" to /members for the rest.
              
              Not a gate — every published member is public, and /members serves
              all 28 to anybody. It is a length decision: the homepage introduces
              the community, and six rows of cards in the middle of it buries
              everything below. The control says how many there are and where
              they are, which is what somebody scanning the page needs.
              
              ShowMore measures rows rather than counting cards, so this is one
              whole row at every width instead of a ragged part-row on one of
              them. Ungated, so it renders as a real link that navigates. */}
          {leadership.length > 0 && (
            <>
              <h3 className="display-3 center mt-lg u-mb-2">{t.home.members.leadership}</h3>
              <ShowMore className="people-flow reveal" id="leadership-preview" href="/members" cap={999}>
                {leadership.map((m, i) => (
                  <PersonCard key={m.id} member={m} index={i} />
                ))}
              </ShowMore>
            </>
          )}

          {general.length > 0 && (
            <>
              <h3 className="display-3 center mt-lg u-mb-2">{t.home.members.general}</h3>
              {/* The same `people-flow` as the leadership row above, not a CSS
                  grid. Both lists sat in this one section using different
                  layouts, and it showed: leadership is flex with
                  `justify-content: center`, so its short last row centres;
                  general members were a five-column grid, so theirs hung on the
                  left with three empty columns beside it. One short row centred
                  directly above another short row jammed left reads as a
                  mistake, because it is — nobody chose it, the two lists were
                  just built at different times. Flex for both. */}
              <ShowMore className="people-flow reveal" id="members-preview"
                        href="/members" cap={4}>
                {general.map((m, i) => (
                  <PersonCard key={m.id} member={m} index={i} />
                ))}
              </ShowMore>
            </>
          )}

          {/* Benefits and how to join, side by side — the pair the static site
              closed this section with. */}
          <div className="grid grid--2 mt-lg">
            <div className="panel reveal">
              <h3 className="panel__title">
                <Icon name="heart" /> {t.home.benefits.title}
              </h3>
              <ul className="benefits">
                {BENEFITS.map((k) => (
                  <li key={k}>
                    <Icon name="check" />
                    <div>
                      <h4>{t.home.benefits[`${k}Title`]}</h4>
                      <p>{t.home.benefits[`${k}Body`]}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel panel--ink reveal">
              <h3 className="panel__title">
                <Icon name="user-plus" /> {t.home.joining.title}
              </h3>
              <ol className="steps">
                <li><div><h4>{t.home.joining.step1Title}</h4><p>{t.home.joining.step1Body}</p></div></li>
                <li><div><h4>{t.home.joining.step2Title}</h4><p>{t.home.joining.step2Body}</p></div></li>
                <li><div><h4>{t.home.joining.step3Title}</h4><p>{t.home.joining.step3Body}</p></div></li>
              </ol>
              <div className="mt-md">
                <Link className="btn btn--on-ink btn--block" href="#contact">
                  {t.home.joining.cta} <Icon name="arrow-right" />
                </Link>
              </div>
            </div>
          </div>

          <div className="cluster cluster--center mt-lg">
            <Link className="btn btn--ghost" href="/members">
              <Icon name="users" /> {t.home.members.registerLink}
            </Link>
            <Link className="btn btn--ghost" href="/me">
              <Icon name="user-plus" /> {t.home.members.addPhoto}
            </Link>
          </div>
          <p className="center text-sm muted u-mt-05">
            {t.home.members.note}
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- join */}
      <section className="section section--ink" id="join">
        <div className="section-photo" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/place-umijigoku.jpg" alt="" loading="lazy" decoding="async" />
        </div>
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="user-plus" /></span>
              {t.home.join.eyebrow}
            </p>
            <h2 className="display-2">{t.home.join.title}</h2>
            <p className="lede">
              {t.home.join.lede}
            </p>
          </div>

          <div className="join-grid">
            <div className="qr-card reveal">
              {/* The frame is the fallback, not a placeholder waiting to be
                  swapped out: SiteMotion removes the <img> if the file is not
                  there, which leaves the drawn frame and its note showing. */}
              <div className="qr-frame">
                <span className="qr-frame__corner" />
                <span className="qr-frame__corner" />
                <span className="qr-frame__corner" />
                <span className="qr-frame__corner" />
                <Icon name="qr" className="qr-frame__glyph icon" />
                <p className="qr-frame__note">{t.home.join.qrNote}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="qr-frame__img" src="/images/qr-code.png"
                     alt={t.home.join.qrAlt} />
              </div>
              <p className="card__title u-mt-1">{t.home.join.scan}</p>
              <p className="text-sm muted">{t.home.join.orLinks}</p>
            </div>

            <div className="social-list reveal">
              {SOCIALS.map((s) => (
                <a className={`social social--${s.modifier}`} key={s.modifier}
                   href={s.href} target="_blank" rel="noopener">
                  <span className="social__icon"><Icon name={s.icon} /></span>
                  <span>
                    <span className="social__label">{s.label}</span><br />
                    <span className="social__meta">{t.home.join[s.metaKey]}</span>
                  </span>
                  <span className="social__go"><Icon name="arrow-right" /></span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- contact */}
      <section className="section" id="contact">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="mail" /></span>
              {t.home.contact.eyebrow}
            </p>
            <h2 className="display-2">{t.home.contact.title}</h2>
            <p className="lede">
              {t.home.contact.lede}
            </p>
          </div>

          <div className="contact-grid">
            <div>
              <ul className="contact-list">
                <li>
                  <div className="plate plate--indigo plate--sm"><Icon name="pin" /></div>
                  <div>
                    <p className="contact-list__label">{t.home.contact.where}</p>
                    <p className="contact-list__value">{t.home.contact.whereValue}</p>
                  </div>
                </li>
                <li>
                  <div className="plate plate--sm"><Icon name="mail" /></div>
                  <div>
                    <p className="contact-list__label">{t.home.contact.email}</p>
                    <p className="contact-list__value">
                      <a href="mailto:nepaloitacommunity11@gmail.com">nepaloitacommunity11@gmail.com</a>
                    </p>
                  </div>
                </li>
                <li>
                  <div className="plate plate--moss plate--sm"><Icon name="phone" /></div>
                  <div>
                    <p className="contact-list__label">{t.home.contact.phone}</p>
                    <p className="contact-list__value">
                      <a href="tel:+818043164111">080&nbsp;4316&nbsp;4111</a>
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>
    </>
  )
}
