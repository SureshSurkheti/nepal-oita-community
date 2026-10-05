import Link from 'next/link'
import { Icon } from '@/components/Sprite'

export default function NotFound() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head section-head--center">
          <p className="eyebrow eyebrow--center">404</p>
          <h1 className="display-2">That page is not here</h1>
          <p className="lede">
            It may have moved, or the link may be mistyped.
          </p>
        </div>
        <div className="cluster cluster--center">
          <Link className="btn btn--primary" href="/">
            <Icon name="home" /> Back to the start
          </Link>
          <Link className="btn btn--ghost" href="/members">
            <Icon name="users" /> Members
          </Link>
        </div>
      </div>
    </section>
  )
}
