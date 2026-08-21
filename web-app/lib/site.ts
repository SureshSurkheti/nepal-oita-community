/* The site's public identity, in one place.
 *
 * It was spelled out in `metadataBase` and nowhere else, so the sitemap, the
 * robots.txt and the structured data would each have needed their own copy of
 * the domain — and a domain that appears in four files is a domain that will one
 * day disagree with itself. Everything below is derived from these constants.
 */
export const SITE_URL = 'https://nepaloitacommunity.com'

export const SITE_NAME = 'Nepal–Oita Community'

/** The names people actually search for, in the three scripts of its audience. */
export const SITE_ALT_NAMES = [
  'Nepal Oita Community',
  'नेपाल ओइता समुदाय',
  'ネパール大分コミュニティ',
  'Nepali Community Oita',
  'Nepali Association Oita Japan',
]

export const SITE_EMAIL = 'nepaloitacommunity11@gmail.com'

/** The public accounts, for schema.org `sameAs` — how a search engine ties the
 *  site and the social profiles together as one organisation. */
export const SITE_SOCIALS = [
  'https://www.facebook.com/nepaloitacommunity98',
  'https://www.youtube.com/@namastejapan-o2u',
  'https://www.tiktok.com/@prayas03',
]

/** Absolute URL for a path, for structured data — which, unlike Next's own
 *  metadata, does not resolve relative URLs against metadataBase. */
export function abs(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
