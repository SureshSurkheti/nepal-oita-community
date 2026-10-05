/* Where an auth callback is allowed to send somebody afterwards.
 *
 * `next` arrives in a URL that anybody can write, and a redirect that follows
 * whatever it is told is an open redirect: send a member a link to
 * nepaloitacommunity.com that bounces to a copy of it, and the address bar says
 * the real domain right up until the moment they type their password. A
 * community whose members are asked to trust a link in an email is exactly the
 * place that attack works.
 *
 * It is a function in its own file so it can be tested, which is the whole
 * point: a guard nobody can run is a guard you are trusting rather than relying
 * on. scripts/safeNext.test.mjs runs the cases below.
 *
 * ONLY A PATH ON THIS SITE IS ACCEPTED, and "starts with a slash" is not enough
 * to decide that. Three ways past the obvious check, all of them real:
 *
 *   //evil.com    protocol-relative. Most browsers fetch it over the current
 *                 scheme, off-site, and it starts with a slash.
 *   /\evil.com    backslashes are normalised to forward slashes by browsers
 *                 following WHATWG URL rules, so this becomes //evil.com.
 *   /\/evil.com   the same trick with one of each.
 *
 * So the test is: one leading slash, and the character after it is neither a
 * slash nor a backslash. Anything else falls back to the member's own page,
 * which is where the callback was going anyway. */
export function safeNext(raw: string | null, lang: string): string {
  const fallback = `/${lang}/me`
  if (!raw) return fallback
  if (raw[0] !== '/') return fallback
  if (raw[1] === '/' || raw[1] === '\\') return fallback
  /* A control character can truncate the header a browser builds from this.
     Nothing legitimate in a path on this site contains one. */
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(raw)) return fallback
  return raw
}
