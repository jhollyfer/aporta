import app from '@adonisjs/core/services/app'
import { defineConfig, formatters, loaders } from '@adonisjs/i18n'
import { LOCALE, LOCALES } from '@aporta/shared'

/**
 * The backend languages (`_standards/i18n.md` §1, §3).
 *
 * The list is that of `@aporta/shared` (`LOCALES`), and it is from here that the `Locale`
 * the rest of the code uses comes: a new language enters there, never in an `if`. `pt-BR` is the
 * default and the fallback for any language without the key.
 *
 * The formatter is ICU, the one the docs recommend: interpolation is `{ name }`, a plain
 * key. `fs` reads `resources/lang/<locale>/*.json` - `errors.json` holds the
 * business messages and `validator.json` the validation ones.
 * (_doc-lib/adonisjs.md#guides/digging-deeper/i18n,
 * https://docs.adonisjs.com/guides/digging-deeper/i18n)
 */
export default defineConfig({
  defaultLocale: LOCALE.PT_BR,
  supportedLocales: [...LOCALES],
  formatter: formatters.icu(),
  loaders: [loaders.fs({ location: app.languageFilesPath() })],
})
