/* Shown while /members is fetching. It is a Suspense fallback, so Next renders
 * it the instant navigation starts — the 150ms delay before it becomes visible
 * is in CSS (`.skeleton`), not here. A page that arrives sooner never shows it.
 *
 * A skeleton rather than a spinner, because this page's shape is known in
 * advance: eight rows of a face and two lines. Drawing that shape means nothing
 * jumps when the real rows replace it, and the reader's eye is already in the
 * right place. A spinner would say "wait" and tell them nothing. */
export default function Loading() {
  return (
    <section className="section">
      <div className="container skeleton">
        <span className="skel skel--title" />
        <span className="skel skel--line skel--w70" style={{ marginBottom: '1.6rem' }} />
        {Array.from({ length: 8 }, (_, i) => (
          <div className="skel-row" key={i}>
            <span className="skel skel--avatar" />
            <span className="skel-row__body">
              <span className="skel skel--line skel--w30" />
              <span className="skel skel--line skel--w45" />
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
