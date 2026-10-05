import type { Locale } from '@/lib/i18n'
import { en, type Dictionary } from './en'
import { ne } from './ne'

/* Both dictionaries are plain objects and both are imported, so both end up in
 * the bundle. That is deliberate at this size: the pair is a few kilobytes, and
 * the alternative — a dynamic import per locale — costs an await on every render
 * and a loading state in the switcher for no measurable saving. Revisit it when
 * the body prose lands and these files are ten times bigger. */
const DICTIONARIES: Record<Locale, Dictionary> = { en, ne }

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

export type { Dictionary }
