import { LocaleLink as Link } from './LocaleLink'
import { Icon } from './Sprite'
import { ToTop } from './ToTop'
import { NewsletterForm } from './NewsletterForm'
import { getDictionary } from '@/lib/dictionaries'
import type { Locale } from '@/lib/i18n'

/* The locale arrives as a prop rather than from usePathname(), so the footer
   stays a server component — it is on every page, and a hook here would ship the
   whole thing to the browser for the sake of one string lookup. */
export function Footer({ lang }: { lang: Locale }) {
  const t = getDictionary(lang)
  return (
    <>
      <footer className="footer">
        <div className="container">
          <div className="footer__grid">
            <div>
              <Link className="brand u-mb-1" href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="brand__mark" src="/images/logo-mark.jpg" alt=""
                     width={320} height={320} decoding="async" />
                <span className="brand__text">
                  <span className="brand__name">Nepal–Oita</span>
                  <span className="brand__sub">Community</span>
                </span>
              </Link>
              <p className="text-sm muted u-measure-sm">
                {t.footer.tagline}<br />
                <span className="deva" lang="ne">नेपाल</span> ·{' '}
                <span className="jp" lang="ja">おおいた</span>
              </p>
            </div>

            <div>
              <h4>{t.footer.explore}</h4>
              <div className="footer__links">
                <Link href="/#about">{t.footer.aboutUs}</Link>
                <Link href="/programmes">{t.nav.programmes}</Link>
                <Link href="/events">{t.nav.events}</Link>
                <Link href="/gallery">{t.nav.gallery}</Link>
                <Link href="/decisions">{t.nav.decisions}</Link>
                <Link href="/members">{t.nav.members}</Link>
              </div>
            </div>

            <div>
              <h4>{t.footer.resources}</h4>
              <div className="footer__links">
                <Link href="/#contact">{t.footer.studentGuide}</Link>
                <Link href="/#contact">{t.footer.jobBoard}</Link>
                <Link href="/#contact">{t.footer.housingHelp}</Link>
                <Link href="/#contact">{t.footer.emergency}</Link>
              </div>
            </div>

            <div>
              <h4>{t.footer.newsletter}</h4>
              <p className="text-sm muted u-mb-1">
                {t.footer.newsletterNote}
              </p>
              <NewsletterForm />
            </div>
          </div>

          <div className="footer__bottom">
            <p>&copy; {new Date().getFullYear()} Nepal–Oita Community. {t.footer.rights}</p>
            <div className="footer__social">
              <a className="brand-facebook" href="https://www.facebook.com/nepaloitacommunity98" aria-label="Facebook" target='_blank'><Icon name="facebook" /></a>
              <a className="brand-youtube" href="https://www.youtube.com/@namastejapan-o2u" aria-label="YouTube" target='_blank'><Icon name="youtube" /></a>
              <a className="brand-tiktok" href="https://www.tiktok.com/@prayas03?_r=1&_t=ZS-992i3ERvHan" aria-label="TikTok" target='_blank'><Icon name="tiktok" /></a>
              <a className="brand-email" href="mailto:nepaloitacommunity11@gmail.com" aria-label={t.home.contact.email}><Icon name="mail" /></a>
            </div>
          </div>
        </div>
      </footer>
      <ToTop />
    </>
  )
}
