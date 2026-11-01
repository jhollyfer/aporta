import { HttpContext } from '@adonisjs/core/http'
import i18nManager from '@adonisjs/i18n/services/main'

/** The ICU variables of a message: `{ name }` becomes plain text, a number goes in unformatted. */
type TranslationData = Record<string, string | number>

/**
 * The translation helper of the business messages (`_standards/i18n.md` §3).
 *
 * The use-case writes `Translation.t('errors.POST_NOT_FOUND')` where the reference example
 * writes `t('posts.not_found')`, and the text comes from
 * `resources/lang/<locale>/{errors,fields}.json`. The language is the one of the request in
 * course: `HttpContext.get()` reads it from the `AsyncLocalStorage` (`useAsyncLocalStorage` in
 * `config/app.ts`), so the use-case never receives the context. Outside a request - a unit
 * spec, a command, a job - there is no context and the default locale answers (pt-BR).
 *
 * A key with no translation comes out as its last segment (`errors.X` becomes `X`), which is
 * what the meta-spec of `lang/` prevents from ever reaching a client.
 */
export default class Translation {
  static t(key: string, data: TranslationData = {}): string {
    const fallback = key.split('.').pop() ?? key
    const context = HttpContext.get()

    if (context) return context.i18n.t(key, data, fallback)

    return i18nManager.locale(i18nManager.defaultLocale).t(key, data, fallback)
  }
}
