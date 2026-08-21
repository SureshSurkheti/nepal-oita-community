import Link from 'next/link'
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
import { PhotoTiles } from '@/components/PhotoTiles'
import { getCurrentMember, getMembers } from '@/lib/members'
import { assetUrl, getEvents, getProgrammes, getPhotos, getStories, getMeetings, longDate, tilePhotos } from '@/lib/content'

const STATS = [
  { to: 100, suffix: '+', label: 'Members' },
  { to: 100, suffix: '+', label: 'Events held' },
  { to: 7, suffix: '', label: 'Years active' },
  { to: 400, suffix: '+', label: 'Lives touched' },
]

const AUDIENCES: { icon: IconName; accent: string; title: string; body: string }[] = [
  { icon: 'graduate', accent: 'indigo', title: 'Students',
    body: 'Course guidance, visa paperwork, scholarship leads and senior students who remember their own first month at APU.' },
  { icon: 'briefcase', accent: 'moss', title: 'Workers',
    body: 'Job openings, workplace translation, help reading a contract, and a network of people in the same trades across the prefecture.' },
  { icon: 'home', accent: 'gold', title: 'Families',
    body: 'School enrolment support, childcare swaps, family gatherings, and a way for our children to grow up knowing both languages.' },
  { icon: 'globe', accent: '', title: 'Neighbours',
    body: 'Our Japanese friends and local organisations — every festival we hold is an open invitation, not a closed door.' },
]

/* The two homes, as the theme lays them out: one group per country, each a wide
   photograph over two square ones. The wide one is first in each group because
   `.place--wide` spans both columns of `.places__grid`. */
const PLACES = [
  {
    label: <><span className="deva" lang="ne">नेपाल</span> Nepal</>,
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
    label: <><span className="jp" lang="ja">おおいた</span> Oita</>,
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

const MEMBER_STATS = [
  { to: 600, label: 'Facebook followers' },
  { to: 500, label: 'Students' },
  { to: 200, label: 'Workers' },
  { to: 50, label: 'Families' },
]

const BENEFITS = [
  ['Free entry to most events', 'Which events are free is decided by a vote of the working members'],
  ['The emergency chain', 'Someone reachable at any hour, in Nepali'],
  ['Jobs and housing first', 'Openings circulate to members before anywhere else'],
  ['The group chats', 'Facebook groups for your area'],
  ['A say in what we do', 'Vote at the general meeting, held every two years'],
]

const SOCIALS: { modifier: string; icon: IconName; href: string; label: string; meta: string }[] = [
  { modifier: 'facebook', icon: 'facebook', href: 'https://www.facebook.com/nepaloitacommunity98',
    label: 'Facebook', meta: 'Announcements and event photos' },
  { modifier: 'youtube', icon: 'youtube', href: 'https://www.youtube.com/@namastejapan-o2u',
    label: 'YouTube — Namaste Japan', meta: 'Festivals and performances in full' },
  { modifier: 'tiktok', icon: 'tiktok', href: 'https://www.tiktok.com/@prayas03?_r=1&_t=ZS-992i3ERvHan',
    label: 'TikTok — Namaste Japan', meta: 'Short clips from events' },
  { modifier: 'email', icon: 'mail', href: 'mailto:nepaloitacommunity11@gmail.com',
    label: 'nepaloitacommunity11@gmail.com', meta: 'We reply within a day or two' },
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
export const metadata: Metadata = {
  title: { absolute: 'Nepal–Oita Community — Nepali community in Oita and Beppu, Japan' },
  alternates: { canonical: '/' },
}

export default async function Home() {
  /* Two waves, not one, and only because of the minutes. Since 0016 they are
     readable by members only — `anon` has no SELECT grant on the tables at all —
     so getMeetings() has to be told whether there is a member before it decides
     whether to send a query. That answer comes from getCurrentMember(), so it
     cannot be in the same Promise.all as the call that needs it. One extra round
     trip, and the alternative was to fire a query that fails for every visitor
     and swallow the error. */
  const member = await getCurrentMember()
  const [members, events, programmes, stories, photos, meetings] = await Promise.all([
    getMembers(), getEvents(), getProgrammes(), getStories(), getPhotos(),
    getMeetings(member !== null),
  ])

  const past = events.filter((e) => e.past)
  const upcoming = events.filter((e) => !e.past)
  const orderedEvents = [...past, ...upcoming]

  /* Live write-ups only. A taken-down one comes back from getMeetings() as well
     for the leadership team, and the front page is not where they should find it.
     
     For a visitor this list is empty by construction — getMeetings() was handed
     `false` above and sent no query — so the whole section disappears rather
     than showing an empty band. 0016 took the minutes off the public web: they
     are the community talking to itself about its own money and arrangements.
     
     No slice: only one is on screen at a time, so the length of the list costs
     nothing and there is no argument for holding any of them back. Reversed,
     because the pager opens on the last one and steps backwards in time — which
     puts the newest first without the arrows working the wrong way round. */
  const decisions = meetings.filter((m) => m.status === 'approved').reverse()
  const latest = decisions.length - 1

  /* Whether to put Edit and Delete on the card. The database refuses the write
     either way, so this only decides whether to offer controls that would fail. */
  const canEditMinutes = member?.can_contribute === true || member?.is_admin === true

  const leadership = members.filter((m) => m.category === 'leadership')
  const general = members.filter((m) => m.category === 'general')
  const signedIn = member !== null

  return (
    <>
      <HeroBody />

      {/* ---------------------------------------------------------------- hero */}
      <section className="hero" id="home">
        <div className="hero__art" aria-hidden="true">
          <div className="hero__grid">
            <div className="hero__cell">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/best.png" alt="" fetchPriority="high" decoding="async" />
            </div>
          </div>
        </div>

        <div className="container hero__content">
          <p className="eyebrow eyebrow--center hero__eyebrow">
            <span className="deva" lang="ne">नेपाल</span> &nbsp;·&nbsp;{' '}
            <span className="jp" lang="ja">おおいた</span> &nbsp;·&nbsp; Est. 2019
          </p>
          <h1 className="display-1 hero__title">
            Bridging Nepali Hearts<br />in <em>Oita</em>, Japan
          </h1>
          <p className="lede hero__lede">
            Uniting the Nepali community in Oita through support, culture and togetherness.
          </p>
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
          <a className="hero__scroll" href="#about">
            <span className="hero__scroll-txt">Explore the community</span>
            <Icon name="chevron-down" className="icon hero__scroll-chev" />
          </a>
          <div className="statbar">
            {STATS.map((s) => (
              <div className="stat" key={s.label}>
                <CountUp to={s.to} suffix={s.suffix} />
                <div className="stat__label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- about */}
      <section className="section" id="about">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="users" /></span>
              Who we support
            </p>
            <h2 className="display-2">Everyone who calls Oita home</h2>
            <p className="lede">
              Arriving in a new country is hard in ways nobody warns you about. Whatever
              brought you here, there is already someone in this community who has been
              exactly where you are.
            </p>
          </div>

          <div className="grid grid--4">
            {AUDIENCES.map((a) => (
              <article className="card reveal" key={a.title}>
                <div className={a.accent ? `plate plate--${a.accent}` : 'plate'}>
                  <Icon name={a.icon} />
                </div>
                <h3 className="card__title">{a.title}</h3>
                <p className="card__body">{a.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- programmes */}
      <section className="section" id="programmes">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="star" /></span>
              What we do
            </p>
            <h2 className="display-2">Done properly, or not at all</h2>
            <p className="lede">
              We would rather do a few things properly than list twenty we cannot deliver.
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
              Two homes
            </p>
            <h2 className="display-2">Six thousand kilometres apart</h2>
            <p className="lede">
              The mountains most of us grew up under, and the hot-spring valley that
              took us in. Both are home now.
            </p>
          </div>

          <div className="places">
            {PLACES.map((group, gi) => (
              <div className={`places__group reveal ${group.reveal}`} key={gi}>
                <h3 className="places__label">{group.label}</h3>
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
              Events
            </p>
            <h2 className="display-2">Come to the next one</h2>
            <p className="lede">
              You do not need to know anyone. Turn up, and you will by the end of the day.
            </p>
          </div>

          {orderedEvents.length === 0 ? (
            <p className="muted">
              Nothing on the calendar just now — new dates go up here as soon as they are set.
            </p>
          ) : (
            <EventsRail pastCount={past.length}
                        upcomingIndex={upcoming.length > 0 ? past.length : -1}>
              {orderedEvents.map((e) => <EventCard key={e.id} event={e} />)}
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
                Gallery
              </p>
              <h2 className="display-2">Seven years of Sundays</h2>
              <p className="lede">
                Every one of these was somebody far from home, having a very good day.
              </p>
            </div>

            <PhotoTiles photos={tilePhotos(photos.slice(0, 4))} />

            <div className="cluster cluster--center mt-lg">
              <Link className="btn btn--ghost" href="/gallery">
                <Icon name="images" /> View the full gallery
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
                In their words
              </p>
              <h2 className="display-2">Community stories</h2>
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
      {decisions.length > 0 && (
        <section className="section" id="decisions">
          <div className="container">
            {/* Centred, unlike Events or Gallery next door. Those have a
                left-aligned head because a full-width grid follows it, so the
                heading never sits beside empty space. This section is one card
                narrower than the container — nothing fills the rest of the row,
                so a left-aligned block left half the width looking unused. The
                whole thing is one centred column instead, which is what the
                site already does for "In their words" and "Our people". */}
            <div className="section-head section-head--center reveal">
              <p className="eyebrow eyebrow--center">
                <span className="eyebrow__badge"><Icon name="check" /></span>
                Minutes
              </p>
              <h2 className="display-2">What we decided</h2>
              <p className="lede">
                The committee and the members meet most months. Nobody has to
                remember what was agreed, or take somebody&rsquo;s word for it.
              </p>
            </div>

            {/* `reveal` on the wrapper, never on the cards inside it. Only one
                card is mounted at a time and it appears mid-scroll when an arrow
                is pressed, long after the IntersectionObserver has finished its
                pass — so a card carrying `.reveal` itself would arrive at
                opacity 0 and stay there. */}
            {/* One column for all three parts. The card was capped at a readable
                measure while the arrows above it and the button below it were
                laid out on the full container, so on a wide screen they lined up
                with three different right-hand edges and left a hole beside the
                card. The panel now carries the measure and everything inside it
                inherits it — heading, arrows, card and button share one edge. */}
            <div className="decisions-panel reveal">
              <DecisionsPager label="Meeting decisions">
                {decisions.map((m, i) => (
                  <article key={m.id}
                           className={`decision${i === latest ? ' decision--latest' : ''}`}>
                    {i === latest && (
                      <p className="decision__flag"><Icon name="star" /> Latest</p>
                    )}
                    <p className="decision__date">
                      <Icon name="calendar" /> {longDate(m.held_on)}
                      {m.place && <span className="decision__place">{m.place}</span>}
                    </p>
                    <h3 className="decision__title">{m.title}</h3>
                    {/* Room for it now that one card has the whole measure. It
                        was left off the strip of narrow cards because a sentence
                        in a 250px column pushed the decisions out of the box. */}
                    {m.summary && <p className="decision__summary">{m.summary}</p>}
                    {/* All the decisions, not the first four. The box has a
                        ceiling and scrolls past it, so a meeting that decided
                        fifteen things does not run down the page. */}
                    {m.points.length > 0 && (
                      <div className="decision__points">
                        <ul className="checklist">
                          {m.points.map((p) => (
                            <li key={p.id}><Icon name="check" /><span>{p.text}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Inside the card, not down in the button row with "Every
                        meeting". Two reasons. It is unambiguous about which
                        write-up it acts on — and the pager renders only the card
                        on screen, so the controls that come with it are always
                        the right ones, with no index to keep in step.
                        
                        Edit only. Delete is deliberately not offered here: the
                        front page is where people come to read what was decided,
                        and a control with no undo does not belong one mis-tap
                        away from it. It is on /decisions, behind "Every meeting,
                        and add one" — a page you have chosen to open. */}
                    {canEditMinutes && (
                      <MeetingEditor allowDelete={false} draft={{
                        id: m.id, held_on: m.held_on, title: m.title,
                        place: m.place, summary: m.summary,
                        points: m.points.map((p) => ({ text: p.text })),
                      }} />
                    )}
                  </article>
                ))}
              </DecisionsPager>

              <div className="cluster cluster--center mt-lg">
                <Link className="btn btn--ghost" href="/decisions">
                  <Icon name="check" /> Every meeting, and add one
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- members */}
      <section className="section section--tinted" id="members">
        <div className="container">
          <div className="section-head section-head--center reveal">
            <p className="eyebrow eyebrow--center">
              <span className="eyebrow__badge"><Icon name="network" /></span>
              Our people
            </p>
            <h2 className="display-2">Six hundred neighbours</h2>
            <p className="lede">Spread across Oita City and Beppu City.</p>
          </div>

          <div className="statbar mt-md">
            {MEMBER_STATS.map((s) => (
              <div className="stat" key={s.label}>
                <CountUp to={s.to} suffix="+" />
                <div className="stat__label">{s.label}</div>
              </div>
            ))}
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
              <h3 className="display-3 center mt-lg u-mb-2">Leadership team</h3>
              <ShowMore className="people-flow" id="leadership-preview" href="/members">
                {leadership.map((m, i) => (
                  <PersonCard key={m.id} member={m} index={i} showContact={signedIn} />
                ))}
              </ShowMore>
            </>
          )}

          {general.length > 0 && (
            <>
              <h3 className="display-3 center mt-lg u-mb-2">General members</h3>
              <ShowMore className="grid grid--five grid--people" id="members-preview"
                        href="/members">
                {general.map((m, i) => (
                  <PersonCard key={m.id} member={m} index={i} showContact={signedIn} />
                ))}
              </ShowMore>
            </>
          )}

          {/* Benefits and how to join, side by side — the pair the static site
              closed this section with. */}
          <div className="grid grid--2 mt-lg">
            <div className="panel reveal">
              <h3 className="panel__title">
                <Icon name="heart" /> What membership gets you
              </h3>
              <ul className="benefits">
                {BENEFITS.map(([title, body]) => (
                  <li key={title}>
                    <Icon name="check" />
                    <div><h4>{title}</h4><p>{body}</p></div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel panel--ink reveal">
              <h3 className="panel__title">
                <Icon name="user-plus" /> Becoming a member
              </h3>
              <ol className="steps">
                <li><div><h4>Fill in the form</h4><p>Online below, or on paper at any event</p></div></li>
                <li><div><h4>Pay the annual fee</h4><p>¥3,000 per year</p></div></li>
                <li><div><h4>Get your card</h4><p>Member ID, and you are added to the groups</p></div></li>
              </ol>
              <div className="mt-md">
                <Link className="btn btn--on-ink btn--block" href="#contact">
                  Register now <Icon name="arrow-right" />
                </Link>
              </div>
            </div>
          </div>

          <div className="cluster cluster--center mt-lg">
            <Link className="btn btn--ghost" href="/members">
              <Icon name="users" /> The register, with contact details
            </Link>
            <Link className="btn btn--ghost" href={signedIn ? '/me' : '/sign-in'}>
              <Icon name="user-plus" /> Add my photo and profession
            </Link>
          </div>
          <p className="center text-sm muted u-mt-05">
            Everybody on the register is listed. Phone numbers are shown to verified
            members only, and each member edits their own card and nobody else&rsquo;s.
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
              Get involved
            </p>
            <h2 className="display-2">Join us today</h2>
            <p className="lede">
              Follow along, drop into a group, or come to an event and say hello.
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
                <p className="qr-frame__note">Facebook QR code goes here</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="qr-frame__img" src="/images/qr-code.png"
                     alt="QR code linking to our Facebook page" />
              </div>
              <p className="card__title u-mt-1">Scan to follow us</p>
              <p className="text-sm muted">Or use the links beside this card</p>
            </div>

            <div className="social-list reveal">
              {SOCIALS.map((s) => (
                <a className={`social social--${s.modifier}`} key={s.modifier}
                   href={s.href} target="_blank" rel="noopener">
                  <span className="social__icon"><Icon name={s.icon} /></span>
                  <span>
                    <span className="social__label">{s.label}</span><br />
                    <span className="social__meta">{s.meta}</span>
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
              Contact
            </p>
            <h2 className="display-2">Get in touch</h2>
            <p className="lede">
              Questions, membership, or something urgent — write to us and a real person
              will answer.
            </p>
          </div>

          <div className="contact-grid">
            <div>
              <ul className="contact-list">
                <li>
                  <div className="plate plate--indigo plate--sm"><Icon name="pin" /></div>
                  <div>
                    <p className="contact-list__label">Where we are</p>
                    <p className="contact-list__value">Oita City and Beppu City, Oita Prefecture</p>
                  </div>
                </li>
                <li>
                  <div className="plate plate--sm"><Icon name="mail" /></div>
                  <div>
                    <p className="contact-list__label">Email</p>
                    <p className="contact-list__value">
                      <a href="mailto:nepaloitacommunity11@gmail.com">nepaloitacommunity11@gmail.com</a>
                    </p>
                  </div>
                </li>
                <li>
                  <div className="plate plate--moss plate--sm"><Icon name="phone" /></div>
                  <div>
                    <p className="contact-list__label">Phone</p>
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
