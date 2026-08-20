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

/** One member card, as a photograph with the name written across the foot of it.
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
    <article className={`ptile reveal${member.category === 'general' ? ' ptile--roster' : ''}`}>
      <span className={`ptile__art ${ART[index % 4]} ptile__art--${WASH[index % 4]}`}
            aria-hidden="true" />

      {/* Shown only without a photograph. Two initials on the wash carry the
          card on their own, and are not a placeholder waiting to be replaced —
          most of the register will never send a portrait. */}
      {!url && <span className="ptile__initials" aria-hidden="true">{initials}</span>}

      {url && (
        <Image className="ptile__img" src={url} alt={member.name}
               width={480} height={600} unoptimized />
      )}

      <span className="ptile__scrim" aria-hidden="true" />

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
