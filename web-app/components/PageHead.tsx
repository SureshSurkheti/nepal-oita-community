import Image from 'next/image'
import { LocaleLink as Link } from './LocaleLink'
import { Icon, type IconName } from './Sprite'
import { SITE_NAME, abs } from '@/lib/site'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n'

/* The photographic page header used by every public sub-page.
 *
 * The static site repeated this block verbatim in five files. It is one
 * component here — but the shape has to stay exactly as the theme expects it,
 * because `.page-head--photo` positions `.hero__art` behind its own container
 * and the veil gradients are tuned to that nesting:
 *
 *     .page-head.page-head--photo > .hero__art > .hero__grid > .hero__cell > img
 *
 * The <img> carries no `is-loaded` class. SiteMotion adds it on load and
 * removes the element outright on error, which is what leaves the generated
 * gradient showing instead of a broken-image icon. Hardcoding the class here
 * would defeat both halves of that. */
export function PageHead({ icon, eyebrow, title, lede, back, path, crumb, lang = DEFAULT_LOCALE }: {
  /* The eyebrow's glyph. Optional so nothing breaks without one, but every
     public page passes it — a page announces its subject with the same icon
     vocabulary the cards inside it use. */
  icon?: IconName
  eyebrow: string
  title: string
  lede?: string
  back?: { href: string; label: string }
  /** This page's own path, e.g. "/events". Emits the BreadcrumbList below — the
   *  structured data Google reads to show "Home › Events" under a result instead
   *  of the bare URL. Omit it on a page that carries `noindex`; a breadcrumb for
   *  a page nobody should reach is noise in the graph. */
  path?: string
  /** The breadcrumb label. Defaults to `eyebrow`, because the display heading is
   *  written to be read ("Come to the next one") and a breadcrumb has to be
   *  written to be scanned ("Events"). Pass this where the eyebrow is not the
   *  clearest short name for the page either. */
  crumb?: string
  /** The page's language. The breadcrumb names absolute URLs, and on this site
   *  every real page lives under a locale — see the note below. */
  lang?: Locale
}) {
  /* Two levels is the whole trail: this site is one page deep. A longer
     invented hierarchy would be a lie Google can check against the links.
     
     EVERY URL HERE CARRIES THE LOCALE, and it did not used to. The trail was
     built from SITE_URL and abs('/events'), which are addresses that do not
     exist: measured, both answer 307 and redirect to /en/…. So every breadcrumb
     on the site pointed at a redirect, and on a Nepali page it pointed at the
     ENGLISH page — telling Google that /ne/events sits under the English home
     page, which is the same contradiction lib/i18n describes for canonicals and
     is why nothing on this site may name a locale-less URL. */
  const at = (p: string) => abs(`/${lang}${p === '/' ? '' : p}`)
  const crumbs = path && {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: at('/') },
      { '@type': 'ListItem', position: 2, name: crumb ?? eyebrow, item: at(path) },
    ],
  }

  return (
    <section className="page-head page-head--photo">
      {crumbs && (
        <script type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      )}
      <div className="hero__art" aria-hidden="true">
        <div className="hero__grid">
          <div className="hero__cell">
            {/* next/image, for two reasons that are easy to miss.
                
                It is the LARGEST CONTENTFUL PAINT of every page that uses
                PageHead — gallery, programmes, events, stories, members,
                decisions — and the source is 1536x1024, four times what a phone
                draws it at. `sizes="100vw"` is honest: the hero really is full
                width.
                
                AND IT WAS COSTING THE HOME PAGE 257KB WITHOUT APPEARING ON IT.
                As a raw <img fetchPriority="high">, React 19 hoists it into a
                <link rel="preload" as="image">. Next prefetches the sub-pages
                linked from the home page, so that preload was being injected
                into a page this component never renders on — traced from the
                request's initiator, which was a script rather than the parser,
                and confirmed by there being no <img> on the page using it.
                Through next/image the preload carries the srcset instead, so a
                phone prefetches a phone-sized copy. */}
            <Image src="/images/best.webp" alt="" fill sizes="100vw" priority />
          </div>
        </div>
      </div>

      <div className="container">
        {back && (
          <Link className="link-arrow page-head__back" href={back.href}>
            <Icon name="arrow-right" flip />
            {back.label}
          </Link>
        )}
        <p className="eyebrow u-mb-1">
          {icon && <span className="eyebrow__badge"><Icon name={icon} /></span>}
          {eyebrow}
        </p>
        <h1 className="display-1 u-measure-title">{title}</h1>
        {lede && <p className="lede u-measure u-mt-1">{lede}</p>}
      </div>
    </section>
  )
}
