import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'

/**
 * Discovers the request language and hands it over in `ctx.i18n`.
 *
 * Reads `Accept-Language` and checks it against `supportedLocales` (the list in
 * `config/i18n.ts`): a language outside it, or an absent header, falls back to the default
 * `pt-BR`. It is server middleware, the first in the stack, so it also holds
 * for the error that happens before the route exists (404, CORS, origin).
 *
 * VineJS messages follow the language without passing through here:
 * `RequestMessagesProvider` (`app/core/validator.ts`) reads the `ctx.i18n` of this
 * request.
 */
export default class DetectUserLocaleMiddleware {
  /**
   * Each requested language followed by its base language: `en-US` becomes `en-US, en`.
   *
   * `@adonisjs/i18n`'s `Negotiator` matches `en` with `en-US`, but not the
   * reverse, so a client that sends only `en-US` would fall back to `pt-BR`. The client's
   * preference order is kept.
   */
  #withBaseLanguages(languages: Array<string>): Array<string> {
    return languages.flatMap((tag) => [tag, tag.split('-')[0] ?? tag])
  }

  async handle(ctx: HttpContext, next: NextFn): Promise<unknown> {
    const language = i18nManager.getSupportedLocaleFor(
      this.#withBaseLanguages(ctx.request.languages()),
    )

    ctx.i18n = i18nManager.locale(language ?? i18nManager.defaultLocale)

    // Whoever injects `I18n` through the constructor receives this request's.
    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    return await next()
  }
}

declare module '@adonisjs/core/http' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- declaration merging requires `interface`
  interface HttpContext {
    i18n: I18n
  }
}
