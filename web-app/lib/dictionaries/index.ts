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

/* The display label for an event's category.
 *
 * The VALUE stored in events.category is English on both sites and always will
 * be — it drives the card accent and the filters, and translating it would file
 * Nepali rows the English site cannot match (see EventProposeForm). This maps
 * that stored value to the reader's language for display only.
 *
 * Anything unrecognised is returned as typed. The committee can enter a category
 * the dictionary has never heard of, and a made-up word shown as-is is better
 * than an empty tag or a crash. */
const CATEGORY_KEYS = {
  Community: 'catCommunity',
  Festival: 'catFestival',
  Sports: 'catSports',
  Cultural: 'catCultural',
  Volunteering: 'catVolunteering',
} as const

export function categoryLabel(t: Dictionary, category: string): string {
  const key = CATEGORY_KEYS[category as keyof typeof CATEGORY_KEYS]
  return key ? t.forms[key] : category
}
