'use client'

import { usePathname } from 'next/navigation'
import { toLocale, type Locale } from '@/lib/i18n'
import { getDictionary, type Dictionary } from '@/lib/dictionaries'

/* Locale and strings for a client component, taken from the URL.
 *
 * No context provider, deliberately. Every page lives under /[lang], so the
 * pathname already IS the answer — a provider would be a second copy of that
 * fact, set from the same place, able to disagree with it during a navigation.
 * Reading the URL cannot drift.
 *
 * Both dictionaries are in the bundle either way (see lib/dictionaries/index),
 * so this costs a string split, not a fetch. */
export function useI18n(): { locale: Locale; t: Dictionary } {
  const pathname = usePathname()
  const locale = toLocale(pathname.split('/')[1])
  return { locale, t: getDictionary(locale) }
}
