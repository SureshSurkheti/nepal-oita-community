import Link from 'next/link'
import { Icon, type IconName } from './Sprite'
import { SITE_URL, SITE_NAME, abs } from '@/lib/site'

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
export function PageHead({ icon, eyebrow, title, lede, back, path, crumb }: {
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
}) {
  /* Two levels is the whole trail: this site is one page deep. A longer
     invented hierarchy would be a lie Google can check against the links. */
  const crumbs = path && {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: crumb ?? eyebrow, item: abs(path) },
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/best.png" alt="" fetchPriority="high" decoding="async" />
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
