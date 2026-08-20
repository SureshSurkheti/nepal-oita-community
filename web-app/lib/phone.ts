/* Turning what a member types into the one form the database stores.
 *
 * 080-4316-4111, 08043164111, +81 80 4316 4111, 0081 80 4316 4111 and
 * 8043164111 are all the same number, and a member will type whichever they
 * remember. They are all reduced to +818043164111 here, before it ever reaches
 * Supabase, so the register has exactly one spelling of each number. */

export function toE164(input: string): string | null {
  const raw = (input || '').trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null

  // Already international, and not a Japanese number: trust it as given.
  if (raw.startsWith('+') && !digits.startsWith('81')) {
    return digits.length >= 8 && digits.length <= 15 ? '+' + digits : null
  }

  let n = digits
  if (n.startsWith('0081')) n = n.slice(4)
  else if (n.startsWith('81') && n.length >= 11) n = n.slice(2)
  n = n.replace(/^0+/, '')

  // Japanese mobile prefixes: 070, 080, 090 — the only ones that can receive
  // an SMS, which is the whole point of asking.
  if (!/^[789]0\d{8}$/.test(n)) return null
  return '+81' + n
}

/** 080 4316 4111 — how a Japanese number is written for a person to read. */
export function formatJP(e164: string | null | undefined): string {
  if (!e164) return ''
  const m = /^\+81([789]0)(\d{4})(\d{4})$/.exec(e164)
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164
}
