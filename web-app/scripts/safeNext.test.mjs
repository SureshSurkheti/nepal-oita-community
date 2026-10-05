/* Cases for lib/safeNext. Run with: npm run test:safenext */
import { safeNext } from '../.tmp-test/safeNext.js'

let fails = 0
const FALLBACK = '/en/me'

function check(name, got, want) {
  if (got === want) { console.log(`  PASS  ${name}`) }
  else { console.log(`  FAIL  ${name}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`); fails++ }
}

console.log('### paths on this site are kept')
for (const p of ['/en/me', '/ne/reset-password', '/en/events/dashain-celebration', '/en/a?b=c#d']) {
  check(p, safeNext(p, 'en'), p)
}

console.log('### anything that leaves this site is refused')
for (const p of [
  '//evil.example.com',            // protocol-relative
  '/\\evil.example.com',           // backslash, normalised to // by browsers
  '/\\/evil.example.com',          // one of each
  '///evil.example.com',
  'https://evil.example.com',
  'http://evil.example.com',
  '//evil.example.com/en/me',
  'javascript:alert(1)',
  'en/me',                         // no leading slash at all
  '',
]) {
  check(JSON.stringify(p), safeNext(p, 'en'), FALLBACK)
}

console.log('### nothing, and control characters')
check('null', safeNext(null, 'en'), FALLBACK)
check('newline injection', safeNext('/en/me\nLocation: https://evil.example.com', 'en'), FALLBACK)
check('null byte', safeNext('/en/me\u0000', 'en'), FALLBACK)

console.log('### the fallback follows the language')
check('ne fallback', safeNext('//evil.example.com', 'ne'), '/ne/me')

console.log(fails === 0 ? '\nall safeNext checks passed' : `\n${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
