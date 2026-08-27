/* The busy indicator for a button that is waiting on the network.
 *
 * A plain element, not a component with state, because it is only ever rendered
 * while something is already known to be pending — the timing decisions live at
 * the call site, not here.
 *
 * WHY IT SITS BESIDE THE WORD AND NOT INSTEAD OF IT
 * Every button on this site already changes its label while it works: "Sending…",
 * "Uploading…", "Checking…". That is the better signal of the two, because it
 * says WHAT is happening rather than only that something is. The spinner is added
 * next to it for the half of the register that reads Nepali or Japanese more
 * comfortably than English — a turning circle needs no translation, and it is the
 * part visible from across the room while a phone uploads a photograph.
 *
 * It replaces the button's own icon rather than being added to it, so the button
 * does not change width when it starts working. */
export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner" role={label ? 'status' : undefined}
          aria-label={label} aria-hidden={label ? undefined : true} />
  )
}
