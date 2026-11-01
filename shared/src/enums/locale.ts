/**
 * The product's languages (`_standards/i18n.md` §1). `pt-BR` is the base: it is what the
 * validation message uses until the full i18n arrives.
 */
export const LOCALE = {
  PT_BR: 'pt-BR',
  ES: 'es',
  EN: 'en',
} as const

export type Locale = (typeof LOCALE)[keyof typeof LOCALE]

export const LOCALES = Object.values(LOCALE)
