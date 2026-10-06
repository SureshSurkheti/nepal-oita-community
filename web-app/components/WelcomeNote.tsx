import Image from 'next/image'
import { Icon } from './Sprite'
import { photoUrl } from '@/lib/members'
import type { MemberWithContact } from '@/lib/types'
import type { Locale } from '@/lib/i18n'

/* A signed word from whoever holds the office, on the home page.
 *
 * WHY IT RENDERS NOTHING BY DEFAULT
 * `welcome` arrives empty on every row (migration 0026 seeds nothing), and the
 * band is absent until a real person has typed real words into the committee
 * page. That is the whole design, not a loading state: a greeting signed with
 * the president's name, face and office that the president did not write is not
 * a placeholder, it is a forgery — and it would be the single most prominent
 * piece of text on the site. An empty column is the honest state, and an absent
 * section is what an empty column should look like.
 *
 * WHOSE WORDS
 * The first leadership member who has written any, in the committee's own
 * `sort_order` — so it follows the office rather than naming a person in code,
 * and the day the committee changes it follows them with no deploy. If two have
 * written something, the senior one is shown; this is a home page, not a
 * noticeboard.
 *
 * THE COLUMN MAY NOT EXIST. 0026 can be unrun — the member rows are fetched with
 * select('*'), so the field is simply absent rather than an error, and `??` does
 * the rest. The site works a migration behind; it just has no band. */
export function WelcomeNote({ members, lang, t }: {
  members: MemberWithContact[]
  lang: Locale
  t: { eyebrow: string; meet: string }
}) {
  const speaker = members.find(
    (m) => m.category === 'leadership' && String(withWelcome(m).welcome ?? '').trim(),
  )
  if (!speaker) return null

  const w = withWelcome(speaker)
  /* The Nepali copy where there is one, the English where there is not — the
     same fallback every other translated field on this site uses, so a half
     translated site reads as English rather than as a gap. */
  const ne = w.welcome_ne?.trim()
  /* Which language the paragraph ACTUALLY ends up in, tracked rather than
     inferred by comparing the two strings afterwards: a committee that pastes
     the same text into both boxes would make `words === ne` true on the English
     page and have a screen reader read English in a Nepali voice. */
  const inNepali = lang === 'ne' && Boolean(ne)
  const words = inNepali ? ne! : String(w.welcome).trim()
  const photo = photoUrl(speaker.photo_path)

  return (
    <section className="section section--tight" id="welcome">
      <div className="container">
        <div className="saying reveal">
          <div className="saying__portrait" aria-hidden="true">
            {photo
              ? <Image src={photo} alt="" width={128} height={128} sizes="128px" />
              : <span>{speaker.initials ?? speaker.name.charAt(0)}</span>}
          </div>
          <blockquote className="saying__body">
            <p className="eyebrow">
              <span className="eyebrow__badge"><Icon name="heart" /></span>
              {t.eyebrow}
            </p>
            {/* `lang` on the text itself, not only on the page: when the Nepali
                is missing this paragraph is English on a page declared Nepali,
                and a screen reader would otherwise read it in the wrong voice. */}
            <p className="saying__quote" lang={inNepali ? 'ne' : 'en'}>{words}</p>
            <cite className="saying__who">
              <span className="saying__name">{speaker.name}</span>
              {speaker.role && <> · <span className="saying__role">{speaker.role}</span></>}
            </cite>
          </blockquote>
        </div>
      </div>
    </section>
  )
}

/* The two columns 0026 adds, read off a row typed before they existed. Narrowing
   here rather than widening `Member` keeps the optionality in one place: every
   other reader of that type goes on seeing a complete row. */
function withWelcome(m: MemberWithContact): { welcome?: string | null; welcome_ne?: string | null } {
  return m as unknown as { welcome?: string | null; welcome_ne?: string | null }
}
