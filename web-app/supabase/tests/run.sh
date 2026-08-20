#!/usr/bin/env bash
# Policy tests for the Supabase schema, against a throwaway PostgreSQL.
#
# These are the tests that matter most in this project. Everything protecting
# members' phone numbers, and everything stopping one member editing another's
# card, lives in the migrations rather than in the app — so it is the migrations
# that have to be tested. A passing `next build` says nothing about any of it.
#
#   ./run.sh
#
# Needs a local PostgreSQL server (brew install postgresql@17). It never touches
# your Supabase project.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
MIG="$HERE/../migrations"
PGROOT="${PGROOT:-/tmp/noc-pgtest}"
PORT="${PORT:-55433}"
export LC_ALL=C LANG=C

PGBIN="${PGBIN:-$(ls -d /opt/homebrew/Cellar/postgresql@1[789]/*/bin 2>/dev/null | tail -1 || true)}"
if [ -z "${PGBIN:-}" ] || [ ! -x "$PGBIN/postgres" ]; then
  echo "No local PostgreSQL server found.  brew install postgresql@17" >&2
  exit 1
fi

if [ ! -d "$PGROOT/data" ]; then
  mkdir -p "$PGROOT"
  "$PGBIN/initdb" -D "$PGROOT/data" -U postgres --auth=trust --locale=C >/dev/null
fi
if ! "$PGBIN/pg_isready" -h "$PGROOT" -p "$PORT" >/dev/null 2>&1; then
  "$PGBIN/pg_ctl" -D "$PGROOT/data" \
    -o "-p $PORT -k $PGROOT -c listen_addresses=''" -l "$PGROOT/pg.log" start >/dev/null
  sleep 2
fi

PSQL="$PGBIN/psql -h $PGROOT -p $PORT -U postgres"
fails=0

# Applies the schema to a fresh database. $1 = database name, rest = extra files.
setup() {
  local db="$1"; shift
  $PSQL -q -c "drop database if exists $db" -c "create database $db" 2>/dev/null
  local run="$PSQL -d $db -v ON_ERROR_STOP=1 -q"
  $run -f "$HERE/00_stubs.sql" >/dev/null
  # Everything except the bootstrap (0006, edited by hand) and the seed data
  # (0007, 0008), which are passed in per scenario.
  #
  # This was a hand-written list of globs — 000[1-5] and 0009 — and every
  # migration added after it was silently left untested. Three of them were,
  # including the one that made the whole member register public. Derive the
  # list instead, so a new file is covered the moment it exists.
  local f
  for f in $(ls "$MIG"/*.sql | grep -vE '/(0006|0007|0008)_') "$@"; do
    if ! out="$($run -f "$f" 2>&1 | grep -vE 'NOTICE' || true)"; then :; fi
    if [ -n "${out:-}" ]; then echo "  ERROR applying $(basename "$f"):"; echo "$out"; exit 1; fi
  done
}

# Runs a test file and tallies its FAILs.
check() {
  local db="$1" file="$2"
  local out
  out="$($PSQL -d "$db" -q -f "$file" 2>&1 | sed -E 's/^psql:[^ ]*[0-9]+: NOTICE:  //')"
  echo "$out" | grep -E '^(PASS|FAIL|===)' || true
  fails=$(( fails + $(echo "$out" | grep -c '^FAIL' || true) ))
}

# --------------------------------------------------------------------------
#  Scenario one: hand-made fixtures, every policy poked at individually.
# --------------------------------------------------------------------------
echo "### policies, against fixtures"
setup noc_policies
$PSQL -d noc_policies -v ON_ERROR_STOP=1 -q -f "$HERE/01_fixtures.sql" >/dev/null
check noc_policies "$HERE/02_policies.sql"
check noc_policies "$HERE/03_preview.sql"
check noc_policies "$HERE/07_claim_codes.sql"
check noc_policies "$HERE/08_meetings.sql"
check noc_policies "$HERE/09_roles.sql"

# --------------------------------------------------------------------------
#  Scenario two: the real install path — seed the 28 members, bootstrap the
#  first admin, then walk through what actually happens on day one. Separate
#  database because 0006/0007 are the production data, not fixtures, and mixing
#  them would let a fixture mask a mistake in the seed.
# --------------------------------------------------------------------------
echo
echo "### the real install path"
setup noc_install "$MIG/0007_seed_members.sql" "$MIG/0008_seed_content.sql" \
                  "$HERE/05_install_admin.sql"
check noc_install "$HERE/04_end_to_end.sql"

# --------------------------------------------------------------------------
#  link_member.sql — the committee setting somebody up directly. Its two refusals
#  are the point of testing it: both of them protect a person's access rather
#  than any data, and both fail silently if they stop working. An account holding
#  two cards cannot use the site at all, because getCurrentMember() reads its
#  card with maybeSingle().
# --------------------------------------------------------------------------
echo
echo "### link_member.sql"
mklink() {   # $1 email  $2 slug  $3 admin  $4 out
  sed -E -e "s|^  v_email text    := '[^']*'|  v_email text    := '$1'|" \
         -e "s|^  v_slug  text    := '[^']*'|  v_slug  text    := '$2'|" \
         -e "s|^  v_admin boolean := false|  v_admin boolean := $3|" \
         "$HERE/../link_member.sql" > "$4"
}
LM="$(mktemp -t noc_lm).sql"

$PSQL -d noc_install -q -c "
  update public.members set user_id = null where slug in ('member-13','member-14');
  insert into auth.users (id, email) values
    (gen_random_uuid(),'lm-one@test.invalid'), (gen_random_uuid(),'lm-two@test.invalid')
  on conflict do nothing;" >/dev/null

link_case() {   # $1 label  $2 email  $3 slug  $4 admin  $5 expected text
  mklink "$2" "$3" "$4" "$LM"
  local out
  out="$($PSQL -d noc_install -f "$LM" 2>&1)"
  if echo "$out" | grep -q "$5"; then
    echo "  PASS  $1"
  else
    echo "  FAIL  $1"
    echo "$out" | grep -iE 'ERROR|NOTICE' | head -2 | sed 's/^/          /'
    fails=$((fails+1))
  fi
}

link_case "links a card and grants committee access" \
          lm-one@test.invalid member-13 true "can now sign in"
link_case "and is safe to run twice" \
          lm-one@test.invalid member-13 true "can now sign in"
link_case "refuses a second card for the same account" \
          lm-one@test.invalid member-14 false "already holds card"
link_case "refuses a card that belongs to another account" \
          lm-two@test.invalid member-13 false "already linked to a different account"
link_case "refuses an address with no account" \
          nobody-at-all@test.invalid member-14 false "No account for"
link_case "refuses a slug that does not exist" \
          lm-two@test.invalid no-such-card false "No member card with slug"
link_case "refuses the unedited template" \
          someone@example.com member-14 false "Nothing was changed"

# It must never take committee access away — removing it is a deliberate act on
# the Committee page, not a side effect of re-running a setup script.
mklink lm-one@test.invalid member-13 false "$LM"
$PSQL -d noc_install -q -f "$LM" >/dev/null 2>&1
still=$($PSQL -d noc_install -q -t -A -c "select is_admin from public.members where slug='member-13';")
if [ "$still" = "t" ]; then
  echo "  PASS  and re-running with admin=false does not revoke it"
else
  echo "  FAIL  re-running with admin=false revoked committee access"; fails=$((fails+1))
fi
rm -f "$LM"

# --------------------------------------------------------------------------
#  The development sign-in bypass. Installed onto the install-path database,
#  exercised, then removed again — and the removal is checked, because a bypass
#  you cannot prove is gone is a bypass that ships.
# --------------------------------------------------------------------------
echo
echo "### the development sign-in bypass"
$PSQL -d noc_install -v ON_ERROR_STOP=1 -q -f "$HERE/../dev/dev_signin.sql" >/dev/null 2>&1
check noc_install "$HERE/06_dev_signin.sql"

# Claim a card with an anonymous session, then remove the bypass and confirm
# both the function and the claim are gone.
$PSQL -d noc_install -q -c "
  insert into auth.users (id, is_anonymous)
       values ('dddddddd-dddd-dddd-dddd-dddddddddddd', true)
  on conflict do nothing;
  update public.members set user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
   where slug = 'member-03';" >/dev/null
$PSQL -d noc_install -v ON_ERROR_STOP=1 -q -f "$HERE/../dev/dev_signin_remove.sql" >/dev/null 2>&1
left=$($PSQL -d noc_install -q -t -A -c "
  select (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname like 'dev\_%')
       + (select count(*) from public.members m join auth.users u on u.id=m.user_id
           where u.is_anonymous);")
if [ "$left" = "0" ]; then
  echo "  PASS  removing it drops the functions and releases the cards it claimed"
else
  echo "  FAIL  $left dev function(s)/claimed card(s) survived the removal script"
  fails=$((fails+1))
fi

# --------------------------------------------------------------------------
#  The committee-account bootstrap. Its guards check the VALUES rather than
#  comparing against the placeholder text, because 0006 did the latter and the
#  same find-and-replace that filled the file in also rewrote the guard — so it
#  refused correctly edited input and accepted uneditied input. Both directions
#  are tested here.
# --------------------------------------------------------------------------
echo
echo "### the committee-account bootstrap"

# Both cases are built by REWRITING the v_email line, whatever it currently
# says, rather than by substituting the placeholder text. admin_account.sql is a
# file the committee edits — it already holds a real address — so a sed that
# matched the placeholder silently stopped testing anything the moment it was
# filled in. That is the second time this project has been bitten by a test that
# depends on the contents of a hand-edited file; the fix is to depend on the
# file's SHAPE instead.
# Anchored to the start of the declaration line. Unanchored, the pattern also
# matched inside the guard's own error message — which quotes the declaration
# back at the reader — and mangled that string literal into a syntax error.
mkscript() {   # $1 = email to put in, $2 = slug, $3 = output path
  sed -E -e "s|^  v_email text := '[^']*'|  v_email text := '$1'|" \
         -e "s|^  v_slug  text := '[^']*'|  v_slug  text := '$2'|" \
         "$HERE/../admin_account.sql" > "$3"
}

UNEDITED="$(mktemp -t noc_unedited).sql"
mkscript 'committee@nepal-oita.example' 'committee' "$UNEDITED"
if $PSQL -d noc_install -f "$UNEDITED" 2>&1 | grep -q "Nothing was changed"; then
  echo "  PASS  the unedited template is refused"
else
  echo "  FAIL  it accepted the unedited template"; fails=$((fails+1))
fi
rm -f "$UNEDITED"

# Its own slug as well as its own address. This assertion failed once and could
# not be reproduced, and the difference between the failing run and the passing
# ones was leftover state on the shared `committee` slug from an earlier manual
# run. Rather than leave a test that flips, give it a row nothing else touches.
BOOT="$(mktemp -t noc_boot).sql"
mkscript 'committee@test.invalid' 'committee-test' "$BOOT"
$PSQL -d noc_install -q -c "insert into auth.users (id, email)
  values (gen_random_uuid(), 'committee@test.invalid') on conflict do nothing;" >/dev/null
BOOTOUT="$($PSQL -d noc_install -f "$BOOT" 2>&1)"
if echo "$BOOTOUT" | grep -q "Committee access granted"; then
  # ...and it must actually have set the flag, not merely not thrown.
  granted=$($PSQL -d noc_install -q -t -A -c "
    select count(*) from public.members m join auth.users u on u.id = m.user_id
     where u.email = 'committee@test.invalid' and m.is_admin;")
  if [ "$granted" = "1" ]; then
    echo "  PASS  a real address is accepted and gets committee access"
  else
    echo "  FAIL  it reported success but is_admin was not set"; fails=$((fails+1))
  fi
else
  echo "  FAIL  it refused a valid address"
  echo "$BOOTOUT" | grep -iE 'ERROR|NOTICE' | head -3 | sed 's/^/        /'
  fails=$((fails+1))
fi

# An address with no account at all has to say so, not fail obscurely.
NOACC="$(mktemp -t noc_noacc).sql"
mkscript 'nobody@test.invalid' 'nobody-test' "$NOACC"
if $PSQL -d noc_install -f "$NOACC" 2>&1 | grep -q "Make it first"; then
  echo "  PASS  an address with no account is told where to make one"
else
  echo "  FAIL  it did not explain the missing account"; fails=$((fails+1))
fi
rm -f "$BOOT" "$NOACC"

# --------------------------------------------------------------------------
#  verify.sql is the file the committee runs to see what landed. It is SQL like
#  any other and can go stale against the seed it describes — its "of 6" and
#  "of 28" are hardcoded. Run it here, on the database the install path just
#  built, and fail on any row it flags. Without this, verify.sql could tell the
#  committee something was wrong when it was not, or the reverse.
# --------------------------------------------------------------------------
echo
echo "### verify.sql agrees with a fresh install"
# Its own database, and deliberately WITHOUT 05_install_admin: this is exactly
# what the committee's project looks like the moment setup.sql has been pasted
# in and nothing else has happened yet. Running it against noc_install instead
# would read the phone numbers the walkthrough above registers and report them
# as an unexpected finding.
setup noc_verify "$MIG/0007_seed_members.sql" "$MIG/0008_seed_content.sql"
VOUT="$($PSQL -d noc_verify -q -t -A -F ' | ' -f "$HERE/../verify.sql" 2>&1)"
if echo "$VOUT" | grep -q 'CHECK THIS'; then
  echo "$VOUT" | grep 'CHECK THIS' | sed 's/^/  flagged: /'
  # The gallery bucket is empty on a fresh install by design — the files are
  # uploaded through the app, not by a migration. Every other flag is a fault.
  unexpected=$(echo "$VOUT" | grep -c 'CHECK THIS' || true)
  expected=$(echo "$VOUT" | grep 'CHECK THIS' | grep -c 'actually uploaded' || true)
  if [ "$unexpected" -gt "$expected" ]; then
    fails=$(( fails + unexpected - expected ))
  else
    echo "  PASS  the only flag is the empty photo bucket, which is expected"
  fi
else
  echo "  PASS  every check reports ok"
fi

echo
if [ "$fails" -eq 0 ]; then
  echo "all policy tests passed"
else
  echo "$fails FAILURES"; exit 1
fi
