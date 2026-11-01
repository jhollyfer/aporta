import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@aporta/shared'

import openapi from '#config/openapi'
import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'

type Response = Either<HTTPException, string>

/**
 * The navigable reference page, built over `/openapi.json`.
 *
 * Scalar comes in through the CDN standalone bundle, pinned by version. Installing
 * `@scalar/api-reference` as a dependency would bring a frontend tree into the backend build
 * just to serve a `<script>`, and `node ace build` would have to learn to copy it.
 *
 * The version is pinned on purpose: `@latest` would make the documentation change behavior
 * without any commit in the repository.
 */
@inject()
export default class DocumentationReferenceShowUseCase {
  private static readonly SCALAR_VERSION = '1.64.0'

  private static readonly CDN = `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${DocumentationReferenceShowUseCase.SCALAR_VERSION}/dist/browser/standalone.js`

  execute(): Promise<Response> {
    try {
      return Promise.resolve(
        right(this.#page('/openapi.json', openapi.info.title)),
      )
    } catch (error) {
      logger.error({ err: error }, '[documentation/reference > show][error]')

      return Promise.resolve(
        left(
          HTTPException.InternalServerError(
            Translation.t('errors.DOCUMENTATION_REFERENCE_SHOW_ERROR'),
            'DOCUMENTATION_REFERENCE_SHOW_ERROR',
          ),
        ),
      )
    }
  }

  /**
   * The interface chrome stays in English: Scalar translates to `en`, `ru`, `es`,
   * `fr`, `de`, `zh-CN` and `ar`, and Portuguese is not on the list. The content -
   * summary, description and error message - is in Portuguese, which is what matters.
   */
  #page(specUrl: string, title: string): string {
    const configuration = JSON.stringify({
      url: specUrl,
      theme: 'default',
      hideDownloadButton: false,
      // `components.schemas` exists for operations to reference and for whoever
      // generates a typed client. As a menu section it only invites reading the API by the
      // shape of the data, which is the opposite of what this documentation describes - the
      // contract is the operation, not the entity.
      hideModels: true,
    })

    return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex" />
      <title>${title}</title>
    </head>
    <body>
      <div id="app"></div>
      <script src="${DocumentationReferenceShowUseCase.CDN}"></script>
      <script>
        Scalar.createApiReference('#app', ${configuration})
      </script>
    </body>
  </html>
  `
  }
}
