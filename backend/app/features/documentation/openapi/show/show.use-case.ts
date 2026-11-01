import { readFile } from 'node:fs/promises'

import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import { vine } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import env from '#start/env'

/** The document is any JSON object; the validator is the boundary that types it. */
const openapiDocument = vine.compile(vine.object({}).allowUnknownProperties())

type Response = Either<HTTPException, Record<string, unknown>>

/**
 * The OpenAPI document, as `node ace openapi:generate` wrote it.
 *
 * Read from disk on the first request and kept in memory: it is a generated and
 * committed artifact, and in production it does not change while the process lives. Reading on every
 * request would only waste I/O.
 *
 * The file carries `servers` with the `{APP_SERVER_URL}` variable, so generation is
 * the same on every machine; here it becomes this environment's address, which is where
 * the reference's "Test Request" should send.
 */
@inject()
export default class DocumentationOpenapiShowUseCase {
  private static cache: Record<string, unknown> | undefined

  async execute(): Promise<Response> {
    try {
      DocumentationOpenapiShowUseCase.cache ??=
        (await this.#read()) ?? undefined

      if (DocumentationOpenapiShowUseCase.cache === undefined) {
        logger.error(
          '[documentation/openapi > show][error] openapi.json is not a JSON object',
        )

        return left(this.#failure())
      }

      return right(DocumentationOpenapiShowUseCase.cache)
    } catch (error) {
      logger.error({ err: error }, '[documentation/openapi > show][error]')

      return left(this.#failure())
    }
  }

  #failure(): HTTPException {
    return HTTPException.InternalServerError(
      Translation.t('errors.DOCUMENTATION_OPENAPI_SHOW_ERROR'),
      'DOCUMENTATION_OPENAPI_SHOW_ERROR',
    )
  }

  /**
   * The JSON from disk is `unknown` until the validator proves it is an object
   * (`typescript.md` §2); `null` when it is not.
   */
  async #read(): Promise<Record<string, unknown> | null> {
    const parsed: unknown = JSON.parse(
      await readFile(app.makePath('openapi.json'), 'utf-8'),
    )

    const [error, document] = await openapiDocument.tryValidate(parsed)

    if (error) return null

    return {
      ...document,
      servers: [
        { url: env.get('APP_SERVER_URL'), description: 'Servidor atual' },
      ],
    }
  }
}
