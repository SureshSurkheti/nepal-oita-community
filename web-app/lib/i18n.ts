/* Two languages, and the reason the URL carries the choice.
 *
 * A language switch can live in three places: the URL (/ne/events), a cookie, or
 * component state. Only the first is visible to a search engine. The committee
 * asked for Nepali because much of the community reads it more comfortably than
 * English — and those same people search in Nepali. A client-side toggle would
 * serve them the Nepali text and leave Google with one English page, so the
 * Nepali version could never be found by anybody who was not already on the site.
 *
 * Sub-path (/ne/…) rather than a separate domain: one certificate, one Search
 * Console property, one deployment, and hreflang ties the pair together.
 *
 * WHY 'ne' AND NOT 'np'
 * ne is the ISO 639-1 language code for Nepali. np is the ISO 3166 COUNTRY code
 * for Nepal. hreflang wants the language, and a community in Oita is not in
 * Nepal — half the point of the site is that they are here.
 */

export const LOCALES = ['en', 'ne'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** What each language calls itself. Never "Nepali" in an English list — a
 *  switcher is read by somebody who does not yet have the language they want. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ne: 'नेपाली',
}

/** For <html lang> and hreflang. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en',
  ne: 'ne',
}

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}

/** Narrow an unknown route param to a locale, falling back to English. */
export function toLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}

/* Swap the locale segment of a path, keeping everything after it — so the
   switcher lands on the SAME page in the other language rather than sending
   somebody back to the home page, which is the single most annoying thing a
   language switcher can do. */
export function withLocale(pathname: string, locale: Locale): string {
  const parts = pathname.split('/').filter(Boolean)
  if (isLocale(parts[0])) parts[0] = locale
  else parts.unshift(locale)
  return '/' + parts.join('/')
}

/** The path with no locale on the front, for comparing routes. */
export function stripLocale(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  if (isLocale(parts[0])) parts.shift()
  return '/' + parts.join('/')
}

/* Canonical + hreflang for one page, in one call.
 *
 * TWO BUGS THIS EXISTS TO PREVENT, both silent.
 *
 * 1. After the move to /[lang], a canonical of '/events' points at a URL that
 *    REDIRECTS. A canonical must be the final address of the page — one that
 *    redirects tells Google the real page is somewhere else, and it is the kind
 *    of mistake that costs rankings without ever showing up as an error.
 *
 * 2. Without `languages`, /en/events and /ne/events look like two pages with the
 *    same content. Google picks one and drops the other, which is precisely the
 *    opposite of why the site was translated.
 *
 * Paths are relative; Next resolves them against metadataBase in the layout.
 */
export function localeAlternates(lang: Locale, path: string) {
  const at = (l: string) => `/${l}${path === '/' ? '' : path}`
  const languages: Record<string, string> = {}
  for (const l of LOCALES) languages[l] = at(l)
  /* The fallback for a reader whose language matches neither. It must be a real
     page, not the bare domain — the bare domain redirects. */
  languages['x-default'] = at(DEFAULT_LOCALE)
  return { canonical: at(lang), languages }
}
