# The old static site

The hand-written site this project replaced: plain HTML, one `theme.css`, one
`app.js`, no build step. Open `index.html` in a browser and it works.

It is kept because it is what was actually deployed while `web-app/` was being
built, and because it is the reference every page of the Next.js app was checked
against. Delete it once `web-app/` has been live for a while and you are
confident in it — not before.

## One file is deliberately missing

`data/members.json` is not here and must not be added. It holds all 28 members'
phone numbers as PBKDF2-SHA256 hashes, and a Japanese mobile number is only
about 3x10^8 possibilities — small enough to try every one. The file also uses a
single shared salt, so one pass recovers every number rather than one. This
repository is public. See the note in `.gitignore`.

The members-only gate on this site needs that file, so the gate will not work
from a fresh clone. That is the intended trade: the register lives in Supabase
now, in a table the anonymous role has no grant on.
