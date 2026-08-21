import Image from 'next/image'
import { Icon } from './Sprite'
import { photoUrl } from '@/lib/members'
import { formatJP } from '@/lib/phone'
import type { MemberWithContact } from '@/lib/types'

/* The wash and drawn pattern behind a member with no photograph. Cycled by
   position, the same four as the gallery tiles, so a wall of cards without
   photographs still reads as varied rather than as twenty-eight empty boxes.
   Right now that is every card: nobody has uploaded a portrait yet. */
const WASH = ['crimson', 'indigo', 'moss', 'gold'] as const
const ART = ['art-rays', 'art-wave', 'art-lattice', 'art-dots'] as const

/** One member card: the photograph on top, the person's details underneath.
 *
 *  It used to be a portrait with the name written across the foot of it, held
 *  legible by a scrim. That reads at 260px wide and fails at 160px, where the
 *  name, the office and the profession stack into the bottom third of a small
 *  square and land on whatever the photograph happens to be doing there — which
 *  is why phones already had this layout and desktops did not. It is now the
 *  layout at every width: one design, and nothing written over anybody's face.
 *
 *  `.ptile__media` is the picture half. It carries a fixed aspect ratio, so
 *  every portrait — a passport crop, a wide group shot somebody has cut
 *  themselves out of — is covered into the same window and a row of cards never
 *  goes ragged.
 *
 *  `showContact` is a rendering hint only — if the visitor is not a member the
 *  contact object is null anyway, because the database did not return it.
 *  Nothing here is load-bearing for privacy. */
export function PersonCard({
  member,
  index = 0,
  showContact = false,
}: {
  member: MemberWithContact
  index?: number
  showContact?: boolean
}) {
  const url = photoUrl(member.photo_path)
  const contact = showContact ? member.contact : null
  const initials = member.initials ?? member.name.charAt(0)

  const socials = ([
    { href: member.facebook_url, icon: 'facebook', label: 'Facebook' },
    { href: member.instagram_url, icon: 'instagram', label: 'Instagram' },
    { href: member.tiktok_url, icon: 'tiktok', label: 'TikTok' },
  ] as const).filter((s): s is typeof s & { href: string } => Boolean(s.href))

  return (
    /* The wash modifier is on the card, not only on the art layer: `--wash` now
       also colours the hairline above the caption and the office pill inside
       it, and a custom property set on a child cannot be read by its sibling. */
    <article className={`ptile ptile--${WASH[index % 4]} reveal`
                        + (member.category === 'general' ? ' ptile--roster' : '')}>
      <span className="ptile__media">
        <span className={`ptile__art ${ART[index % 4]} ptile__art--${WASH[index % 4]}`}
              aria-hidden="true" />

        {/* Shown only without a photograph. Two initials on the wash carry the
            card on their own, and are not a placeholder waiting to be replaced —
            most of the register will never send a portrait. */}
        {!url && <span className="ptile__initials" aria-hidden="true">{initials}</span>}

        {url && (
          <Image className="ptile__img" src={url} alt={member.name}
                 width={480} height={480} unoptimized />
        )}
      </span>

      <span className="ptile__cap">
        <strong className="ptile__name">{member.name}</strong>
        {member.role && <span className="ptile__role">{member.role}</span>}
        <span className={`ptile__job${member.profession ? '' : ' ptile__job--empty'}`}>
          {member.profession || 'Profession not listed'}
        </span>

        {/* Social links are public: they live on `members`, which anyone may
            read, and they point at pages that are public already. The phone
            number is not, and is only here at all when the database returned a
            contact row — which it does not do for anyone who is not a verified
            member. */}
        {(socials.length > 0 || contact?.phone_e164) && (
          <span className="ptile__links">
            {contact?.phone_e164 && (
              <a href={`tel:${contact.phone_e164}`}>
                <Icon name="phone" /> {formatJP(contact.phone_e164)}
              </a>
            )}
            {socials.map((s) => (
              <a key={s.icon} href={s.href} rel="noopener nofollow"
                 aria-label={`${member.name} on ${s.label}`}>
                <Icon name={s.icon} />
              </a>
            ))}
          </span>
        )}
      </span>
    </article>
  )
}
