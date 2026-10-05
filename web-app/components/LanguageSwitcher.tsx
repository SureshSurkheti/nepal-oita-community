'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LOCALES, LOCALE_NAMES, toLocale, withLocale, type Locale } from '@/lib/i18n'

/* English / नेपाली, in the header.
 *
 * BOTH LANGUAGES ARE ALWAYS SHOWN, never a single button that says "नेपाली" and
 * toggles. A toggle has to be read by somebody who may not read the language it
 * is currently in, and "नेपाली" on its own is ambiguous: is that the language I
 * am in, or the one I would get? Two labels with one marked current answers it
 * without reading any prose.
 *
 * Each option is a real <a href>, not a button with an onClick. That matters for
 * three separate reasons: a crawler follows it and so discovers the other
 * language, middle-click and "open in new tab" work, and it still works before
 * hydration. The onClick only adds the cookie — navigation happens either way.
 *
 * THE COOKIE IS THE POINT OF THE onClick
 * proxy.ts sends somebody without a locale in the URL to one based on
 * Accept-Language. A reader whose phone is in Japanese but who reads Nepali
 * would be sent to English every time they typed the bare domain. Pressing this
 * records the choice, and the proxy prefers it over the header from then on.
 * One year, Lax — it is a display preference, not a credential.
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const current = toLocale(pathname.split('/')[1])

  function choose(locale: Locale) {
    document.cookie = `noc-locale=${locale}; path=/; max-age=31536000; samesite=lax`
    /* refresh() as well as the navigation: the layout is a server component and
       its strings come from the lang param, so the tree has to be re-rendered
       rather than reused from the client cache. */
    router.push(withLocale(pathname, locale))
    router.refresh()
  }

  return (
    <div className={`langsw ${className}`.trim()} role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <a key={l}
           className={`langsw__opt${l === current ? ' is-current' : ''}`}
           href={withLocale(pathname, l)}
           hrefLang={l}
           aria-current={l === current ? 'true' : undefined}
           onClick={(e) => { e.preventDefault(); choose(l) }}>
          {/* The short code on narrow screens, the language's own name when
              there is room. Both are in the markup so the crawler sees the
              full name whichever width it renders at. */}
          <span className="langsw__short" aria-hidden="true">{l === 'ne' ? 'ने' : 'EN'}</span>
          <span className="langsw__full">{LOCALE_NAMES[l]}</span>
        </a>
      ))}
    </div>
  )
}
