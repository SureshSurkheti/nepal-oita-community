'use client'

import Link from 'next/link'
import { forwardRef } from 'react'
import { usePathname } from 'next/navigation'
import { toLocale, withLocale } from '@/lib/i18n'

type Props = Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }

/* next/link that keeps you in the language you are reading.
 *
 * Every internal href in this app was written as "/events" — 47 of them. Under
 * /[lang] routing each one has to become "/ne/events" for a Nepali reader, and
 * hand-editing 47 call sites is both tedious and the kind of change where three
 * get missed and silently throw somebody back into English mid-visit.
 *
 * So the prefix is added here instead, from the URL the reader is already on.
 * Call sites keep writing "/events" and stay readable.
 *
 * A hash-only href ("#contact") is passed through untouched — it addresses the
 * current page, and prefixing it would turn an in-page jump into a navigation.
 * An absolute URL (mailto:, https:, tel:) likewise. */
export const LocaleLink = forwardRef<HTMLAnchorElement, Props>(
  function LocaleLink({ href, ...rest }, ref) {
    const pathname = usePathname()
    const locale = toLocale(pathname.split('/')[1])

    const local = href.startsWith('/') && !href.startsWith('//')
    if (!local) return <Link ref={ref} href={href} {...rest} />

    /* "/#contact" is the home page plus an anchor: the path half needs the
       locale, the hash half must survive intact. */
    const [path, hash] = href.split('#')
    const prefixed = withLocale(path || '/', locale) + (hash ? `#${hash}` : '')
    return <Link ref={ref} href={prefixed} {...rest} />
  },
)
