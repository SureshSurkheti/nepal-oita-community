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

const out = header + body
const path = join(root, 'supabase', 'setup.sql')

if (process.argv.includes('--check')) {
  const current = readFileSync(path, 'utf8')
  if (current !== out) {
    console.error('supabase/setup.sql is out of date. Run: npm run build:sql')
    process.exit(1)
  }
  console.log(`supabase/setup.sql is up to date (${files.length} migrations).`)
} else {
  writeFileSync(path, out)
  console.log(`supabase/setup.sql written from ${files.length} migrations:`)
  for (const f of files) console.log('  ' + f)
}
