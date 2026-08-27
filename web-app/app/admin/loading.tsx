/* The Committee page while its six counts are being read.
 *
 * This one covers every /admin route, because a loading.tsx applies to its whole
 * subtree — /admin/members, /admin/events and the rest all borrow it. That is
 * the right trade here: they are all committee-only, all read several tables,
 * and all show a heading over a list, so one shape fits them. Adding a bespoke
 * skeleton per admin page would be five more files for a screen two people see. */
export default function Loading() {
  return (
    <section className="section">
      <div className="container skeleton">
        <span className="skel skel--title" />
        <span className="skel skel--line skel--w70" style={{ marginBottom: '1.6rem' }} />
        <div className="grid grid--3">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="panel" key={i}>
              <span className="skel skel--line skel--w45" style={{ marginBottom: '0.7rem' }} />
              <span className="skel skel--line" style={{ marginBottom: '0.45rem' }} />
              <span className="skel skel--line skel--w70" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
