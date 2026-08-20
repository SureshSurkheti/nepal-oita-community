// Compiled by tsc, not stripped by hand — a regex "type remover" broke on the
// first union type it met and would have silently tested the wrong code.
/* Compiled by tsc into .tmp-test/ first — see the `test:phone` npm script.
 *
 * An earlier version of this file stripped the TypeScript types with a regex.
 * It broke on the first union type it met and would have happily "tested"
 * nothing at all. */
import { toE164, formatJP } from '../.tmp-test/phone.js'

let fails = 0
const eq = (got, want, label) => {
  const ok = got === want
  if (!ok) fails++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`)
}

console.log('\n=== the same number, however it is typed ===')
for (const input of ['08043164111','080 4316 4111','080-4316-4111','+818043164111',
                     '+81 80 4316 4111','8043164111','0081 80 4316 4111','０８０４３１６４１１１'.replace(/[０-９]/g, d => '0123456789'[d.charCodeAt(0)-0xFF10])]) {
  eq(toE164(input), '+818043164111', `"${input}"`)
}

console.log('\n=== all three mobile prefixes ===')
eq(toE164('070 1234 5678'), '+817012345678', '070')
eq(toE164('080 1234 5678'), '+818012345678', '080')
eq(toE164('090 1234 5678'), '+819012345678', '090')

console.log('\n=== refused ===')
eq(toE164(''), null, 'empty')
eq(toE164('097 123 4567'), null, 'an Oita landline cannot receive an SMS')
eq(toE164('080 4316 411'), null, 'one digit short')
eq(toE164('080 4316 41112'), null, 'one digit long')
eq(toE164('hello'), null, 'not a number')

console.log('\n=== a genuinely foreign number passes through ===')
eq(toE164('+977 1 4444444'), '+97714444444', 'Nepal')

console.log('\n=== formatted back for a person to read ===')
eq(formatJP('+818043164111'), '080 4316 4111', 'E.164 to Japanese spacing')
eq(formatJP(null), '', 'null is blank, not "null"')
eq(formatJP('+97714444444'), '+97714444444', 'a foreign number is left alone')

console.log(`\n${fails ? fails + ' FAILURES' : 'all phone checks passed'}`)
process.exit(fails ? 1 : 0)
