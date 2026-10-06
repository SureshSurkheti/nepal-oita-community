/* The photographs this site owns, and which one a coverless event borrows.
 *
 * NOTHING IS IMPORTED HERE, AND THAT IS LOAD-BEARING. This module is used by
 * client components — the hero ribbon and the full-screen showcase — and the
 * obvious home for coverFor() was right here beside the list it picks from.
 * But coverFor needs assetUrl from lib/content, lib/content reaches Supabase
 * through next/headers, and next/headers cannot be imported into a client
 * component: the build fails outright. So coverFor lives in lib/content with
 * the function it depends on, and this file stays data plus arithmetic that
 * runs anywhere.
 *
 * WHY THIS FILE EXISTS. `cover_path` is a column on the events table, and for a
 * long time nothing wrote to it: every event on the site rendered the drawn
 * fallback pattern instead of a photograph, and the fix was always "run the
 * migration that assigns covers". That is a bad dependency. A community website
 * should not look half-finished because a SQL file has not been pasted into a
 * dashboard — and the committee adding an event in thirty seconds should not
 * have to find an image first for the card not to look broken.
 *
 * So a coverless event now takes one of the photographs the site already ships,
 * the same ones the hero slides through. A real cover uploaded by the committee
 * still wins; this only fills the gap.
 */

/* The hero rotation. First one first: it is the only one in the server's HTML,
 * the only one with `priority`, and therefore the one Largest Contentful Paint
 * is measured against. Changing the first line changes the page's speed score.
 *
 * THE COMMUNITY'S OWN PHOTOGRAPHS, which is what this list always wanted to be.
 * It used to be seven: two stock-ish views of Oita and five Creative Commons
 * photographs of Nepal — Everest, Boudhanath, Ama Dablam, sakura, Umijigoku.
 * They were handsome and they were nobody's. A visitor could not tell from them
 * whether this community has ten people in it or a thousand, which is the one
 * thing the top of the page should answer.
 *
 * Two of the three are now photographs the committee took, of its own people:
 *
 *   community-oita.webp   the indoor gathering, the whole room
 *   best.webp             the mountains over the lake, kept deliberately — it
 *                         is the "two homes" idea the whole site is built on,
 *                         and the one slide the headline was composed against
 *   community-park.webp   the group on the bench, in a park in Oita
 *
 * The five Creative Commons files leave the ROTATION only. Every one of them is
 * still on the page — the "Two homes" section shows all six by name, and the
 * join band uses Umijigoku — so PHOTO-CREDITS.md stays exactly as load-bearing
 * as it was, and none of the files may be deleted. Coverless events still borrow
 * them too; see FALLBACK_COVERS below, which is why that list is written out in
 * full rather than spread from this one.
 *
 * THE HEADLINE SITS ON SLIDE ONE, so a photograph here is not just a photograph.
 * Measured off the rendered pixels, by hiding the type and sampling the band it
 * occupies — not estimated from the file. Text is rgb(27,23,20):
 *
 *                 mean background      ratio    darkest pixel in the band
 *   title         rgb(217,213,204)    12.15:1          3.63:1
 *   lede          rgb(241,234,223)    14.89:1          7.63:1
 *
 * The floors are 3.0 for display type and 4.5 for body, so both pass even
 * against the worst pixel either one lands on, which is the honest test — a mean
 * hides a dark patch the type happens to sit over. It passes because the band
 * the type occupies is the room's ceiling and upper wall, which are nearly
 * white; the people are below it. That is a fact about THIS photograph, so
 * measure again before putting a different one first.
 *
 * SLIDE THREE IS THE WEAK ONE, and it is worth saying so rather than letting
 * somebody rediscover it. community-park.webp is 1079x1080 — the largest copy
 * that exists in the gallery. A full-bleed hero on a 1440px retina desktop asks
 * for about 2880px, so Next upscales it and the faces go soft; it is the only
 * photograph on this site being enlarged rather than reduced. Its composition
 * is also the opposite of slide one's: the people fill the frame from top to
 * bottom, so there is no band of quiet background for the headline to sit on at
 * ANY object-position, and the title crosses their faces.
 *
 * It is here because the committee asked for it. Two things would fix it, and
 * both need a person rather than a build: the original full-size file off
 * whoever's phone took it, or a wider frame with sky or grass above the group.
 * Until then it is third, which is the slot that does the least harm — nobody
 * sees it until the rotation has run twice.
 *
 * WHAT IS STILL LEFT OUT, each for a reason worth keeping written down:
 *
 *   oita_city.png       Carries a DREAMSTIME WATERMARK across the middle. It is
 *                       unlicensed stock and cannot go on the site at all.
 *   logo-mark-1.png     The flags emblem: a logo rather than a photograph.
 *                       Cropped square-to-widescreen it loses both flags, and
 *                       dark hero type on white is unreadable.
 *   og-cover.jpg        The same Everest/Nuptse view as place-everest.jpg, and
 *                       at 1200px wide it softens on a desktop.
 *   place-usajingu.jpg  Measured 1.96 contrast for the hero title against the
 *                       dark tree canopy directly behind it. */
export const HERO_PHOTOS = [
  '/images/community-oita.webp',
  '/images/best.webp',
  '/images/community-park.webp',
]

/* What a coverless event borrows.
 *
 * The hero set PLUS place-usajingu, which is excluded from the hero only because
 * the headline sits on top of it and failed contrast there. Nothing is written
 * over an event cover, so that objection does not apply and it is simply another
 * good photograph of Oita.
 *
 * festival.jpg and movie.jpg are deliberately NOT here. They are the printed
 * bills for two specific events, so handing one to an unrelated event would put
 * the Kabaddi poster on the football tournament — a picture that is wrong rather
 * than merely generic, which is worse than the drawn pattern ever was. */
const FALLBACK_COVERS = [
  '/images/best.webp',
  '/images/city-view.webp',
  '/images/place-umijigoku.jpg',
  '/images/place-everest.jpg',
  '/images/place-sakura.jpg',
  '/images/place-amadablam.jpg',
  '/images/place-boudhanath.jpg',
  '/images/place-usajingu.jpg',
]

/* Stable, and that is the whole requirement.
 *
 * The same event must get the same photograph on the home page, on the events
 * page, inside the showcase and on its own page — anything random would deal a
 * different picture to each, and the card somebody pressed would not be the page
 * they land on. So it is derived from the slug alone: no state, no index (which
 * differs between a rail of ten and a page showing one), and the same answer on
 * the server and in the browser, which matters because these components hydrate.
 *
 * FNV-1a RATHER THAN SOMETHING SIMPLER, and it was measured rather than assumed.
 * The first version summed the character codes, which put THREE of the ten
 * events on best.webp and left one photograph unused — a rail where the same
 * picture appears three times reads as a bug. Over the twelve real slugs, into
 * eight photographs:
 *
 *   sum of codes   3 0 2 1 1 1 2 2   worst 3
 *   djb2           0 0 1 3 1 1 5 1   worst 5
 *   sdbm           1 4 1 1 1 1 2 1   worst 4
 *   FNV-1a         1 0 2 2 2 2 2 1   worst 2
 *
 * Twelve into eight cannot do better than two, so FNV-1a is as even as this gets
 * without the function knowing about the other events. Math.imul keeps the
 * multiply in 32-bit, which is the whole point of the algorithm — a plain `*`
 * overflows into floating point and the avalanche is lost. */

/* The borrowed photograph on its own, ignoring whatever the event claims to
 * have.
 *
 * THIS IS ALSO THE REPAIR FOR A COVER THAT DOES NOT LOAD, which is not a
 * hypothetical. Migration 0022 points eight events at gallery objects in
 * Supabase storage, and those files have not been uploaded — so the moment that
 * migration runs, cover_path becomes a non-null URL that 404s, coverFor hands it
 * back because it is non-null, and eight cards that currently show a photograph
 * would show a broken image instead. Worse after running the migration than
 * before, which is the kind of regression nobody goes looking for.
 *
 * So every cover on the site is rendered with this as its onError fallback. It
 * covers the uploaded-later case, a deleted file, and a mistyped path, and it
 * means cover_path can be filled in confidently without first checking that
 * every object really exists. */
export function fallbackCoverFor(slug: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return FALLBACK_COVERS[h % FALLBACK_COVERS.length]
}
