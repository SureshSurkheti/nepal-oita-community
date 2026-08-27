'use server'

import { updateTag } from 'next/cache'

/* A member editing their own story, from the browser.
 *
 * Since 0018 a member can edit a story that is already approved and on the site.
 * That write goes straight from their browser to Supabase, so nothing on the
 * server knows it happened — and the approved-stories read is cached for five
 * minutes. Without this the member saves a typo fix, sees the old words, and
 * saves again.
 *
 * Takes no arguments and reveals nothing: it clears one cache tag. There is
 * deliberately no way to pass a tag in from the client.
 *
 * updateTag rather than revalidateTag: this is a read-your-own-writes case. The
 * member has just saved and is looking at the page. revalidateTag(tag, 'max')
 * would serve them the stale copy while refreshing behind their back, which is
 * indistinguishable from the save having failed. */
export async function refreshStories() {
  updateTag('stories')
}
