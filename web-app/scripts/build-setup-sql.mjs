#!/usr/bin/env node
/* Regenerates supabase/setup.sql from supabase/migrations/.
 *
 * setup.sql exists because the Supabase dashboard has no migration runner: the
 * committee pastes one file into the SQL editor. It was assembled by hand once,
 * which meant that editing a migration silently left setup.sql — the file
 * anybody actually runs — a version behind. Now it is generated, and
 * `npm run check:sql` fails if it has drifted.
 *
 * 0006_first_admin.sql is excluded on purpose: it has to be edited to name a
 * real person before it is run, so it stays a separate step. */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'supabase', 'migrations')
const EXCLUDE = ['0006_first_admin.sql']

const files = readdirSync(dir).filter((f) => f.endsWith('.sql') && !EXCLUDE.includes(f)).sort()

const header = `-- ===========================================================================
--  Nepal-Oita Community — complete database setup, in one file
--
--  Paste the whole thing into the Supabase dashboard's SQL editor and run it
--  once. It is the migrations in supabase/migrations/ concatenated in order;
--  running them one at a time gives exactly the same result.
--
--  GENERATED FILE — do not edit. Change a migration and run:
--      npm run build:sql
--
--  Safe to re-run: every statement is CREATE ... IF NOT EXISTS, CREATE OR
--  REPLACE, or an upsert. Verified by applying it twice to an empty database.
--
--  NOT INCLUDED: 0006_first_admin.sql. That one names the first committee
--  member and has to be edited before it is run, so it stays separate. Run it
--  second, after this file.
--
--  Afterwards, run supabase/verify.sql to see what actually landed.
-- ===========================================================================
`

const body = files.map((f) => {
  const name = f.replace(/\.sql$/, '')
  return `

-- ###########################################################################
-- ##  ${name}
-- ###########################################################################

${readFileSync(join(dir, f), 'utf8').trimEnd()}
`
}).join('')

/* The second file: just the migrations the live project has not run yet.
 *
 * setup.sql is for an EMPTY database — it builds the whole schema from nothing.
 * Pasting it into a project that is already live works, because every statement
 * is idempotent, but it is 2,000 lines and the committee has to trust all of
 * them. This is the short one: the handful of migrations that are actually
 * outstanding, with a header saying what each one turns on.
 *
 * GENERATED, and that is the point. It was maintained by hand and went a
 * migration behind the moment one was added — which is the exact failure
 * setup.sql was generated to stop, repeated in the file the committee is more
 * likely to run. `npm run check:sql` now covers both.
 *
 * PENDING_FROM is the only thing to maintain: raise it once the committee has
 * confirmed a migration has been run on the live project. */
const PENDING_FROM = '0020'
const pending = files.filter((f) => f.slice(0, 4) >= PENDING_FROM)

/* Every migration's second line is `--  Its title`. Taking the description from
   the file means the header cannot describe one thing while the SQL below it
   does another. */
const titleOf = (f) =>
  readFileSync(join(dir, f), 'utf8').split('\n')[1].replace(/^--\s*/, '').trim()

const pendingHeader = `-- ===========================================================================
--  RUN THIS ONCE, IN THE SUPABASE SQL EDITOR
--
--  Dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
--  GENERATED FILE — do not edit. Change a migration and run:
--      npm run build:sql
--
--  These are the ${pending.length} migrations the live project has not run yet. Until this
--  file runs, the site works but shows none of what they add:
--
${pending.map((f) => `--    ${f.slice(0, 4)}  ${titleOf(f)}`).join('\n')}
--
--  Safe to run more than once: every statement either fills in a blank, matches
--  on a key that is already there, or is an upsert. Nothing is deleted.
--
--  Afterwards, run supabase/verify.sql to see what actually landed.
-- ===========================================================================
`

const pendingBody = pending.map((f) => {
  const name = f.replace(/\.sql$/, '')
  return `

-- ###########################################################################
-- ##  ${name}
-- ###########################################################################

${readFileSync(join(dir, f), 'utf8').trimEnd()}
`
}).join('')

const outputs = [
  { path: join(root, 'supabase', 'setup.sql'), text: header + body,
    label: `supabase/setup.sql`, count: files.length },
  { path: join(root, 'supabase', 'RUN-IN-SQL-EDITOR.sql'), text: pendingHeader + pendingBody,
    label: `supabase/RUN-IN-SQL-EDITOR.sql`, count: pending.length },
]

if (process.argv.includes('--check')) {
  let stale = false
  for (const o of outputs) {
    if (readFileSync(o.path, 'utf8') !== o.text) {
      console.error(`${o.label} is out of date. Run: npm run build:sql`)
      stale = true
    } else {
      console.log(`${o.label} is up to date (${o.count} migrations).`)
    }
  }
  if (stale) process.exit(1)
} else {
  for (const o of outputs) {
    writeFileSync(o.path, o.text)
    console.log(`${o.label} written from ${o.count} migrations.`)
  }
  for (const f of files) console.log('  ' + f)
}
