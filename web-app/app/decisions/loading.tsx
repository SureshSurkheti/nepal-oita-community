/* /decisions while it loads. Same reasoning as app/members/loading.tsx: the
 * fade-in delay lives in `.skeleton` in CSS, so this costs nothing on a fast
 * response. Three write-up cards, which is what the page opens with. */
export default function Loading() {
  return (
    <section className="section">
      <div className="container skeleton">
        <span className="skel skel--title" />
        <span className="skel skel--line skel--w70" style={{ marginBottom: '1.6rem' }} />
        {Array.from({ length: 3 }, (_, i) => (
          <div className="panel u-mb-15" key={i}>
            <span className="skel skel--line skel--w45" style={{ marginBottom: '0.8rem' }} />
            <span className="skel skel--line" style={{ marginBottom: '0.5rem' }} />
            <span className="skel skel--line" style={{ marginBottom: '0.5rem' }} />
            <span className="skel skel--line skel--w70" />
          </div>
        ))}
      </div>
    </section>
  )
}
