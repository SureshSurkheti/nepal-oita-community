# Nepal–Oita Community — Next.js + Supabase

The members system: phone sign-in, a register the public cannot read, and members
editing their own card. The rest of the site (homepage, gallery, events,
programmes, stories) is still the static site in the folder above; the database
tables for those already exist, so they can move across next.

```
web/
├── app/                    Pages. theme.css lives here and is now the canonical copy.
├── components/             Nav, cards, forms. Sprite.tsx is generated from the old sprite.
├── lib/
│   ├── supabase/           server.ts (RSC + actions), client.ts (browser)
│   ├── members.ts          the one place that answers "who is this, are they a member"
│   └── phone.ts            080-4316-4111 / +81 80 4316 4111 / 8043164111 → +818043164111
├── proxy.ts                refreshes the session on every request
└── supabase/
    ├── migrations/         0001…0007, applied in order
    └── tests/run.sh        the policy tests — run these
```

---

## Where the security actually is

**Not in this app.** Every rule that matters is in `supabase/migrations` and is
enforced by Postgres:

| Claim | What enforces it |
| --- | --- |
| The public cannot read anyone's phone number | `anon` holds **no grant** on `member_contacts` |
| The public sees only the six office holders | `members_public_read` policy (0005) |
| A member can edit their own card and nobody else's | `members_update_own` policy, keyed on `user_id` |
| A member cannot promote themselves | column-level `GRANT UPDATE (profession, photo_path)` — `role` and `is_admin` are not granted |
| A member cannot change the number they sign in with | `phone_e164` is not in the contacts update grant |
| A member cannot upload over someone else's portrait | storage policy compares the folder to their own slug |
| A member cannot publish their own story | `status` is not in the insert grant, so it defaults to `pending` |

That table is not a description of intent — `supabase/tests/run.sh` asserts every
row of it against a real PostgreSQL. Run it after touching a migration:

```bash
brew install postgresql@17     # once
npm run test:db                # 56 policy checks against a throwaway Postgres
npm run test:phone             # 22 checks on the number normalisation
```

**There is no service-role key in this project, on purpose.** That key bypasses
every policy above. The committee's writes go through `SECURITY DEFINER`
functions (`admin_upsert_member` and friends) that check `is_admin()` inside the
database, so the app never needs it. Do not add it.

---

## Setting it up

### 1. Supabase project

Create one at supabase.com, then **Project settings → API** and copy the two
values into `.env.local`:

```bash
cp .env.example .env.local     # then paste the URL and the key
```

**The URL is the plain project URL** — `https://xxxx.supabase.co`. The dashboard
also shows it under Data API with `/rest/v1/` on the end, and pasting that
version makes every query fail with "Invalid path specified in request URL",
which looks exactly like a site with no content. The app strips the suffix now,
so either works, but the plain one is what to aim for.

The publishable (or legacy `anon`) key is meant to be public. It is safe
precisely because of the policies above — it can only reach what they allow.

### 2. Apply the schema

Dashboard → **SQL editor** → paste the whole of **`supabase/setup.sql`** and run
it. That is 0001–0005 and 0007 concatenated in order, so there is nothing to get
out of sequence. It is safe to run more than once.

(The individual files are still in `supabase/migrations/` if you would rather
apply them one at a time — same result.)

| | |
| --- | --- |
| `0001_members` | tables, the link function, `is_admin()` / `is_member()` |
| `0002_rls` | policies and the column grants |
| `0003_storage` | the two buckets and their policies |
| `0004_content` | events, programmes, stories, photos |
| `0005_preview` | narrows the public read to the preview members |
| `0007_seed_members` | the 28 people already on the site (no phone numbers) |

Then **edit `0006_first_admin.sql`** — the values at the top — and run it
separately. It is not in `setup.sql` precisely because it must be edited first.

`setup.sql` answers "Success. No rows returned", which only means nothing
errored. To see what actually landed, run **`supabase/verify.sql`** — it reports
the seeded counts, that RLS is on, that `anon` cannot read `member_contacts`, and
which three columns a member is allowed to write.
That is the only way to create the first committee account, and it is deliberate:
with no admin in the table there is no "make me an admin" path reachable from the
internet.

### 3. Turn on sign-in

Two dashboard settings and one file, and it costs nothing.

**Authentication → Sign In / Providers → Email**, on. Turn **Confirm email** OFF.

That last part looks alarming and is not, for a specific reason. An email address
is only the login handle here; what proves somebody is on the register is a
one-time code the committee hands over in person. Leaving confirmation on means a
member has to receive a message from Supabase's built-in mailer, which is
rate-limited to a handful an hour and is explicitly not for production — so the
thing keeping them out would be a mail server, not a policy.

**The committee's account.** Authentication → Users → Add user, tick *Auto
Confirm User*, then edit and run `supabase/admin_account.sql` with that address.
Its header explains why one shared password is worth replacing with a code each
as soon as more than one person on the committee logs in.

**Verifying members.** `/admin/members` → *Issue a code* beside a name. It is
shown once and only its hash is kept. Give it to that person; they make their own
account with any email address and enter the code. `verify.sql` reports how many
members have no code outstanding, which is the same question as "how many cannot
get in".

<details>
<summary>Why not SMS, magic links, or just an email address</summary>

| | |
| --- | --- |
| Phone OTP | Strongest, and what this was built for. Needs a Twilio-style account at roughly ¥8–10 a message. |
| Email magic links | Free, but the built-in mailer is rate-limited to a handful an hour and not meant for production. |
| Email + password alone | Free and unlimited — and proves only that somebody owns an email address, which is not membership. |
| **Email + password, plus a code** | What this does. The committee already knows everybody and already hands out membership cards; that is the identity check, performed in person, for nothing. |

It does not stop a member passing their code to somebody else. Nothing short of
checking documents does, and handing it over in person is the check.
</details>

### 3b. Or phone sign-in, if you would rather pay for SMS

**Authentication → Providers → Phone.** Supabase does not send SMS itself, so
this needs an account with one of its providers (Twilio, MessageBird, Vonage,
Textlocal). Expect roughly ¥8–10 per message in Japan, charged by them, not by
Supabase.

Settings worth changing from the defaults:

- **OTP expiry** — 600 seconds. The default is generous for a six-digit code.
- **Rate limit** — Supabase caps SMS per hour per project. Leave it low; each one
  costs money and a loose limit is somebody else's bill.
- **Confirm phone change** — on.

While testing, add test numbers under **Phone → Test OTP** and no SMS is sent
(and nothing is charged) for those numbers.

#### Or skip it for now — the development sign-in

There is a way to work on the members-only half of the site before any of the
above exists. Two steps:

1. **Authentication → Sign In / Providers → Anonymous sign-ins**, on. No
   provider, no credentials, no card.
2. SQL editor: run `supabase/dev/dev_signin.sql`, and put
   `NEXT_PUBLIC_DEV_SIGNIN=1` in `.env.local`.

`/sign-in` then offers a member picker and the code `123456`. The session it
gives you is a real one, so every policy applies and you see exactly what that
member sees.

**Read this part.** It is not a relaxed setting; it is an open door. While
`dev_sign_in_as` exists in the database, anyone who can reach the site can sign
in as any member and read every stored phone number. Two things keep it
contained, and neither is a substitute for removing it:

- the panel does not render under `NODE_ENV=production`, even with the variable
  set at build time (checked: `next start` serves `/sign-in` without it). Note
  what that is and is not — the component is still *in* the bundle, it is just
  unreachable. The guard is a runtime `false`, not a compile-time deletion.
- `verify.sql` reports the bypass as a fault, not as information, so a launch
  checklist that ends in running it cannot miss it

To close it: `supabase/dev/dev_signin_remove.sql`, turn Anonymous sign-ins back
off, and delete the variable. The removal script also releases any member card
the bypass claimed — otherwise the real owner's number would stop reaching their
own profile, with nothing on screen explaining why.

### 4. Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Sign in at `/sign-in` with an email address and a password, then the code from
`/admin/members` — or with the development sign-in above. `/admin/members` then lets you
give everybody else a number.

### 5. Deploy

Vercel: import the repo, set **Root Directory** to `web-app`, add the same two
environment variables. Nothing else to configure.

---

## Day-to-day

**Adding a member.** Committee page → Add a member. Without a number they appear
on the members page but cannot sign in, so they cannot add their own photo
either — the page counts them for you at the top.

**A member's number changes.** Committee page → Change number. They cannot do
this themselves; being able to would be an account takeover in one form
submission.

**Somebody leaves.** Remove them. Their sign-in account survives but is linked to
nothing, so it grants nothing.

**Locked out of the committee.** Re-run an edited `0006_first_admin.sql` for
someone else. `admin_delete_member` and `admin_set_admin` both refuse to remove
the last admin, so this should not happen by accident.

---

## What is not done yet

Everything below was checked against the code and against the live project, not
remembered. The previous version of this list was not: it still said the
homepage, gallery, events, programmes and stories pages were unbuilt, that only
`logo-mark.png` was in `public/`, and that the app had never talked to a real
Supabase project — all of which had been done long before anybody read it
again. A list of gaps that names things which are finished is worse than no list,
because it is the one thing in a README nobody thinks to doubt.

**No password reset.** `SignInForm` signs up and signs in; there is no
`resetPasswordForEmail` anywhere. A member who forgets their password has to be
given a new claim code by the committee, which works but is a phone call every
time. This is the biggest gap for members.

**The committee forms cannot write Nepali.** `0020` and `0021` add `title_ne`,
`body_ne` and `text_ne`, and the pages read them — but nothing under `/admin`
offers a field for them. So every event, programme and story added from now on
is English-only on both halves of the site until somebody writes the Nepali
straight into the database. The dictionaries do not help here: that is the
chrome, and this is the content.

**Editing a block by pressing it.** Asked for, and deliberately not started. It
needs three decisions first — which blocks become editable, what the public page
shows while somebody is mid-edit, and whether a leadership member gets the same
reach as the committee.

**No backup of the database.** The Supabase project is on the free tier, so
there is no point-in-time recovery and no scheduled dump. Everything the
committee has typed in — members, minutes, events, stories — exists in exactly
one place.

**The sitemap has never been submitted.** Thirty URLs, generated at
`/sitemap.xml`, never given to Google Search Console. The site is indexable and
has hreflang on all eight public pages; nobody has told Google it is there.

**`0020` to `0024` have never been run.** Five migrations, sitting in
`supabase/RUN-IN-SQL-EDITOR.sql`. This is the one with the most visible effect
and the least work — see the checklist at the end of this file.

**The old static site can go.** `../static-site/` is no longer in the repository
(`static-site/data/` is gitignored, and nothing under it is tracked), and
`nepaloitacommunity.com` serves this app. Its `data/members.json` still exists on
disk and holds a PBKDF2 hash of every member's phone number against a shared
salt, so it is worth deleting rather than leaving in a folder.


---

## Tonight, at home

A checklist, in order. The first item unblocks four of the others, so do it
first. Everything here needs the Supabase dashboard or the committee pages —
none of it is a code change, and none of it needs a developer.

### 1. Run `supabase/RUN-IN-SQL-EDITOR.sql`

**This is the one that matters.** Five migrations, 470 lines, none of them ever
run on the live project. The site works without them, but it is quietly showing
you the fallback for all five.

Supabase dashboard → **SQL Editor** → **New query** → paste the whole file →
**Run**. It is safe to run more than once: every statement fills in a blank,
matches a key that is already there, or is an upsert. Nothing is deleted.

What changes the moment it finishes:

| | what you will see |
|---|---|
| 0020 | the six "What we do" cards in Nepali. Right now the heading above them translates and the cards do not, because the headings are in the code and the cards are rows in the database — `programmes.title_ne` does not exist yet |
| 0021 | the Kabaddi film show and the Nepali Festival appear, with `movie.jpg` and `festival.jpg` as their posters |
| 0022 | the other events take covers from the community's own photographs |
| 0023 | gallery captions that describe the photograph they are under |
| 0024 | Dashain moves into the past, so the hero ribbon stops announcing it |

If anything goes red, copy the message out before closing the tab — the editor
throws it away when you navigate.

### 2. Run `supabase/verify.sql`

Same editor, second query. It prints a row per check and flags anything wrong
with **CHECK THIS** rather than `ok`. Two of them are the point:

- **gallery files actually uploaded** will say `0 of 12`. That is item 3.
- **the development sign-in bypass.** While `dev_sign_in_as` exists in the
  database, anybody who can reach the site can sign in as any member and read
  every stored phone number. If that row says CHECK THIS, run
  `supabase/dev/dev_signin_remove.sql`, turn Anonymous sign-ins back off in
  Authentication → Providers, and delete `NEXT_PUBLIC_DEV_SIGNIN` from the
  Vercel environment. Do this one before telling anybody the address.

### 3. Upload the gallery photographs

`/admin/photos`, signed in as committee. There are twelve published photo
*records* in the database and zero actual files behind them.

Nothing is broken while they are missing — any cover that does not load falls
back to one of the photographs that ship in `public/images`, so the cards show a
real picture either way. But those are scenery. The community's own photographs
are the point of the gallery, and eight events borrow their covers from it.

### 4. Settle the telephone number

The two disagree and both are published:

- the Nepali Festival poster prints **090-4316-4111**
- this site publishes **080-4316-4111**, in the contact section and in the
  contact form

The 2024 banner inside the poster's own artwork says 080, so the new poster may
simply have a typo. Whichever is right, the other needs correcting — the poster
tells people to come to this website, so the two have to agree. The site's copy
is in `app/[lang]/page.tsx` and `components/ContactForm.tsx`; both link
`tel:+818043164111`, which also has to change.

---

### When the committee has decided, not tonight

Three dates are placeholders. Each is one row at `/admin/events`, and the site
says so in its own words on every one of them — but a chip can only print a day.

- **The Nepali Festival** sits on 1 April 2027. The poster says only "APRIL
  2027" and prints DATE / TIME / VENUE COMING SOON in three languages.
- **Dashain** was moved to 2 October 2026 to put it in the past, where the
  committee says it belongs. If the real date is known, use it.
- **The Kabaddi show** has no start times, no venue and no ticket price. The
  poster leaves `1st SHOW` and `2nd SHOW` blank, so neither was invented.
  Sunday 29 November is from the poster and is correct.

### Still open, and needs a decision rather than an evening

- No password reset. A member who forgets theirs has to be issued a new claim
  code by the committee.
- No admin fields for the `_ne` columns, so anything the committee adds from now
  on is English-only until somebody writes the Nepali into the database by hand.
- The Supabase project is on the free tier, with no backup of the database.
- The sitemap has about thirty URLs and has never been submitted to Google
  Search Console.
