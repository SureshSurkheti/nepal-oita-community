/* The development sign-in bypass — the app's half of it.
 *
 * There is no SMS account on this project yet, so the real front door cannot be
 * opened at all and the members-only half of the site is unreachable. This
 * offers a way in: pick a member, type the code, and you get a genuine session
 * belonging to them. Nothing about the policies changes, so what you see is
 * what that member sees.
 *
 * TWO INDEPENDENT LOCKS, and both have to be open:
 *
 *   1. NODE_ENV must not be production. This is what stops a variable left set
 *      on a host from switching the panel back on: verified by building with
 *      NEXT_PUBLIC_DEV_SIGNIN=1 and confirming `next start` serves /sign-in
 *      without the panel. Be precise about why, though — the component is still
 *      in the bundle. This evaluates to false at runtime; it is not stripped.
 *   2. NEXT_PUBLIC_DEV_SIGNIN must be exactly '1', so it stays off for anyone
 *      who clones the repo and runs `npm run dev` without asking for it.
 *
 * The bypass ALSO needs supabase/dev/dev_signin.sql installed, which is the
 * lock that matters most: while that function exists, anybody who can reach the
 * site can sign in as any member and read every stored phone number. Removing
 * it is what actually closes the door — this file only hides the handle. */

export const DEV_SIGNIN_ENABLED =
  process.env.NODE_ENV !== 'production'
  && process.env.NEXT_PUBLIC_DEV_SIGNIN === '1'

/** Not a secret and not pretending to be. It is here to stop a stray click. */
export const DEV_SIGNIN_CODE = '123456'

export type DevMemberChoice = {
  slug: string
  name: string
  role: string | null
  category: string
  is_admin: boolean
}
