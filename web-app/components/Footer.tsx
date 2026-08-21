import Link from 'next/link'
import { Icon } from './Sprite'
import { ToTop } from './ToTop'
import { NewsletterForm } from './NewsletterForm'

export function Footer() {
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
                Connecting hearts across cultures since 2019.<br />
                <span className="deva" lang="ne">नेपाल</span> ·{' '}
                <span className="jp" lang="ja">おおいた</span>
              </p>
            </div>

            <div>
              <h4>Explore</h4>
              <div className="footer__links">
                <Link href="/#about">About us</Link>
                <Link href="/programmes">Programmes</Link>
                <Link href="/events">Events</Link>
                <Link href="/gallery">Gallery</Link>
                <Link href="/decisions">Decisions</Link>
                <Link href="/members">Members</Link>
              </div>
            </div>

            <div>
              <h4>Resources</h4>
              <div className="footer__links">
                <Link href="/#contact">Student guide</Link>
                <Link href="/#contact">Job board</Link>
                <Link href="/#contact">Housing help</Link>
                <Link href="/#contact">Emergency contacts</Link>
              </div>
            </div>

            <div>
              <h4>Newsletter</h4>
              <p className="text-sm muted u-mb-1">
                One email a month. Events, notices, nothing else.
              </p>
              <NewsletterForm />
            </div>
          </div>

          <div className="footer__bottom">
            <p>&copy; {new Date().getFullYear()} Nepal–Oita Community. All rights reserved.</p>
            <div className="footer__social">
              <a className="brand-facebook" href="https://www.facebook.com/nepaloitacommunity98" aria-label="Facebook" target='_blank'><Icon name="facebook" /></a>
              <a className="brand-youtube" href="https://www.youtube.com/@namastejapan-o2u" aria-label="YouTube" target='_blank'><Icon name="youtube" /></a>
              <a className="brand-tiktok" href="https://www.tiktok.com/@prayas03?_r=1&_t=ZS-992i3ERvHan" aria-label="TikTok" target='_blank'><Icon name="tiktok" /></a>
              <a className="brand-email" href="mailto:nepaloitacommunity11@gmail.com" aria-label="Email"><Icon name="mail" /></a>
            </div>
          </div>
        </div>
      </footer>
      <ToTop />
    </>
  )
}
