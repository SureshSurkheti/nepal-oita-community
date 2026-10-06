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
 * It used to be seven: two views of Oita and five Creative Commons photographs
 * of Nepal — Everest, Boudhanath, Ama Dablam, sakura, Umijigoku. They were
 * handsome and they were nobody's. A visitor could not tell from them whether
 * this community has ten people in it or a thousand, which is the one thing the
 * top of the page should answer.
 *
 *   community-oita.webp   the indoor gathering, the whole room
 *   best.webp             the mountains over the lake, kept deliberately — it
 *                         is the "two homes" idea the site is built on, and the
 *                         one slide the headline was composed against
 *   community-dress.webp  members in Nepali dress at a festival in Oita
 *
 * The five Creative Commons files leave the ROTATION only. All of them are
 * still on the page in "Two homes", so PHOTO-CREDITS.md stays exactly as
 * load-bearing and none of the files may be deleted. Coverless events still
 * borrow them; see FALLBACK_COVERS below, which is why that list is written out
 * in full rather than spread from this one.
 *
 * community-oita.webp IS CROPPED, and only that one. The gallery original is
 * 2048x1536 of which the top third is ceiling, air-conditioning ducting and a
 * spotlight — dead, industrial, and it was most of what a laptop showed. It is
 * cut to 1920x1157 (top 19%, bottom 4% removed), which leaves the people far
 * larger, keeps a quiet strip of wall for the headline, and happens to land at
 * aspect 1.66 against a desktop hero box of about 1.63 — so almost nothing is
 * cropped a second time by object-fit. It also came out 90KB lighter.
 *
 * THE LAYOUT CHANGE IS WHAT MADE THIS LIST POSSIBLE. The hero copy used to sit
 * in the MIDDLE of the photograph under a halo centred at 48% 39%, so the
 * brightest part of the veil landed on the most interesting part of every
 * picture — the people — and the headline landed on their faces. Exactly one
 * photograph in the whole gallery survived that, because exactly one has a
 * quiet ceiling above its group.
 *
 * The copy is now a compact block at the top with the veil moved up to meet it.
 * Measured on the rendered page, title band against rgb(27,23,20):
 *
 *                        BEFORE (centred copy)      AFTER (copy at the top)
 *                        mean     below 3.0:1       mean    worst   below 3.0:1
 *     the room          12.15:1      0.00%         14.74:1  9.39:1     0.00%
 *     traditional dress 11.06:1      0.00%         14.16:1  9.58:1     0.00%
 *     family               —           —           14.59:1  9.24:1     0.00%
 *     football team      2.95:1    (rejected)       13.50:1  9.68:1     0.00%
 *     Lakhe dancer       3.23:1    (rejected)       13.61:1  9.12:1     0.00%
 *
 * The football team went from unusable to one of the best. Contrast stopped
 * being the filter; what is left is composition, which is a judgement:
 *
 * THE RULE THAT DECIDES IT IS NOW ONE SENTENCE: the headline must not cross a
 * face. It is the same rule PersonCard already follows for member portraits,
 * and with contrast no longer the constraint it is the only one left. Checked
 * by rendering each candidate as slide one and looking:
 *
 *   the room           faces sit below the copy block           keep
 *   best.webp          no faces in it at all                    keep
 *   traditional dress  the line passes over hair andthe background above
 *                      the faces, which stay readable           keep
 *   football team      the copy lands on the stadium roof       keep
 *   family             "Bridging Nepali Hearts" covers the
 *                      boy's face completely                    out
 *   Lakhe dancer       the copy lands squarely on the mask,
 *                      which is the entire subject              out
 *   Fukuoka arch       "Nepal Festival Fukuoka2025" is printed across the arch
 *                      at exactly the height of our headline — two sets of
 *                      display type fighting — and it says Fukuoka on the front
 *                      page of an Oita community.
 *   festival banner    The same fault: the banner's own title under ours.
 *   classroom          Scores best of all nine and shows a whiteboard and the
 *                      backs of heads. Legible is not the only test.
 *   park bench         1079x1080 is the largest copy that exists, so a retina
 *                      hero enlarges it and the faces go soft.
 *
 * community-oita.webp IS CROPPED and it is the only one that is. Its gallery
 * original is 2048x1536 of which the top third is ceiling, ducting and a
 * spotlight; it is cut to 1920x1157, which lands at aspect 1.66 against a
 * desktop hero box of about 1.63, so object-fit crops almost nothing a second
 * time. The others are left whole because cropping them to the hero's shape
 * lifts the faces INTO the headline band, which is the trade this file keeps
 * having to make.
 *
 * WHAT IS STILL LEFT OUT:
 *   oita_city.png       Carries a DREAMSTIME WATERMARK across the middle. It is
 *                       unlicensed stock and cannot go on the site at all.
 *   logo-mark-1.png     A logo rather than a photograph; cropped
 *                       square-to-widescreen it loses both flags.
 *   og-cover.jpg        The same Everest view as place-everest.jpg, and at
 *                       1200px wide it softens on a desktop.
 *   place-usajingu.jpg  1.96 for the title against the dark tree canopy. */
export const HERO_PHOTOS = [
  '/images/community-oita.webp',
  '/images/best.webp',
  '/images/community-dress.webp',
  '/images/community-football.webp',
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
