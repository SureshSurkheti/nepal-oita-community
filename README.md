# Nepal–Oita Community

The website of the Nepali community of Oita Prefecture, Japan.

Two folders, and the difference matters:

```
static-site/    The site that is live today. Hand-written HTML, CSS and one
                JavaScript file. No build step, no server — open index.html and
                it works. Deploy this folder as the site root.

web-app/        The replacement, and now feature-complete: every page from the
                static site, plus phone sign-in, a member register the public
                cannot read, and committee screens for editing events, stories,
                photographs and messages without touching code.
                Next.js + Supabase.
```

Each folder has its own guide:

| | |
| --- | --- |
| `static-site/PHOTO-SETUP-GUIDE.md` | adding photos, members, events; how the existing site is put together and the traps in it |
| `web-app/README.md` | Supabase setup, the SMS provider, running the migrations, and where the security actually is |

## Which one is deployed?

Today, `static-site/`. `web-app/` takes over once it has run against a real
Supabase project with the SMS provider connected. Until then the two are
independent, and the static site is the one that matters.

Do not deploy both: there would be two member lists, and the static one's gate
is a courtesy where the app's is enforced by the database.

## Why a rebuild at all

One reason: a static site cannot keep a secret. Every file it serves is
downloadable, so "members only" could never be more than a courtesy — members'
phone numbers could not be stored anywhere the check could reach them without
also publishing them. `web-app/` moves that check to a database, where a policy
can refuse to return a phone number to the public at all.

## Working on it

```bash
# the static site — any static server will do
cd static-site && python3 -m http.server 8000

# the rebuild
cd web-app && npm install && npm run dev

# the database policy tests (these are the important ones)
cd web-app/supabase/tests && ./run.sh
```
