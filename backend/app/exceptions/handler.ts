import { errors as authErrors } from '@adonisjs/auth'
import { errors as bouncerErrors } from '@adonisjs/bouncer'
import { errors as coreErrors } from '@adonisjs/core'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { errors as limiterErrors } from '@adonisjs/limiter'

import type { ErrorEnvelope } from '#core/response'
import { errors as vineErrors } from '#core/validator'
import HTTPException from '#exceptions/http.exception'

type FieldMessage = {
  field: string
  message: string
}

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected override debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  override async handle(error: unknown, ctx: HttpContext): Promise<unknown> {
    /**
     * Only THIRD-PARTY errors are translated here, and only these three: they are the ones that
     * reach the client in their own format and would break the API's single error
     * contract (the nonexistent route, the framework's 404, included: without this
     * the default body comes out in English). HTTPException does not go through here - it resolves in its
     * own `handle()`. The two messages come from `errors.json`, in the request
     * language; the `code` is not translated.
     *
     * The limiter's 429 goes through the same path: the `handle()` of `ThrottleException`
     * itself answers `{ errors: [{ message }] }` in English and without a
     * `code`, outside the envelope. Here the house envelope comes out, and the limit
     * headers (`Retry-After` among them) remain as the package defines them.
     * https://docs.adonisjs.com/guides/security/rate-limiting
     */
    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      const payload: ErrorEnvelope = {
        message: ctx.i18n.t('errors.VALIDATION_ERROR', {}, 'VALIDATION_ERROR'),
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: this.#toFieldErrors(error.messages),
      }

      return ctx.response.status(payload.status).send(payload)
    }

    if (error instanceof coreErrors.E_ROUTE_NOT_FOUND) {
      const payload: ErrorEnvelope = {
        message: ctx.i18n.t('errors.ROUTE_NOT_FOUND', {}, 'ROUTE_NOT_FOUND'),
        status: 404,
        code: 'ROUTE_NOT_FOUND',
      }

      return ctx.response.status(payload.status).send(payload)
    }

    if (error instanceof authErrors.E_UNAUTHORIZED_ACCESS) {
      const payload: ErrorEnvelope = {
        message: ctx.i18n.t('errors.UNAUTHORIZED', {}, 'UNAUTHORIZED'),
        status: 401,
        code: 'UNAUTHORIZED',
      }

      return ctx.response.status(payload.status).send(payload)
    }

    /**
     * The Bouncer denial (`authorize` throws) comes out in the house envelope. The status
     * is what the policy declared - `404` when existence is a secret, `403`
     * when the `actor` sees the record and cannot act -, and the `code` is that of the translation
     * key (`errors.<CODE>`) that the policy base puts in the response,
     * so the text comes out in the request language and the `code` does not change.
     * https://docs.adonisjs.com/guides/auth/authorization
     */
    if (error instanceof bouncerErrors.E_AUTHORIZATION_FAILURE) {
      const identifier =
        error.response.translation?.identifier ?? 'errors.ACCESS_DENIED'
      const payload: ErrorEnvelope = {
        message: ctx.i18n.t(
          identifier,
          error.response.translation?.data,
          error.response.message ?? 'ACCESS_DENIED',
        ),
        status: error.response.status ?? 403,
        code: identifier.replace(/^errors\./, ''),
      }

      return ctx.response.status(payload.status).send(payload)
    }

    if (error instanceof limiterErrors.E_TOO_MANY_REQUESTS) {
      const headers = error.headers ?? error.getDefaultHeaders()

      for (const [name, value] of Object.entries(headers)) {
        ctx.response.header(name, String(value))
      }

      const payload: ErrorEnvelope = {
        message: ctx.i18n.t(
          'errors.TOO_MANY_REQUESTS',
          {},
          'TOO_MANY_REQUESTS',
        ),
        status: 429,
        code: 'TOO_MANY_REQUESTS',
      }

      return ctx.response.status(payload.status).send(payload)
    }

    /**
     * A server failure that is not an `HTTPException`: what escaped the use-cases
     * (the token `issue` in the controller, the cookie, a middleware, the bouncer).
     * The framework's default renderer returns raw `error.message`, and on a Postgres
     * failure that is SQL, table and constraint in the response. The client receives
     * the generic envelope; the detail goes only to `report`, which runs first.
     * https://docs.adonisjs.com/guides/basics/exception-handling
     */
    if (this.#isUnexpectedServerFailure(error)) {
      const payload: ErrorEnvelope = {
        message: ctx.i18n.t('errors.SERVER_ERROR', {}, 'SERVER_ERROR'),
        status: 500,
        code: 'SERVER_ERROR',
      }

      return ctx.response.status(payload.status).send(payload)
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  override async report(error: unknown, ctx: HttpContext) {
    /**
     * The limiter block is a security event, not an application error: one stable
     * line, with the route and the limit numbers. Without the email or IP
     * - the limit key is that information, and it does not go into the log in clear text
     * (`_standards/backend.md` §5.5). The request id goes in `ctx.logger`.
     */
    if (error instanceof limiterErrors.E_TOO_MANY_REQUESTS) {
      ctx.logger.warn(
        {
          route: ctx.route?.pattern ?? ctx.request.url(),
          limit: error.response.limit,
          retryAfter: error.response.availableIn,
        },
        '[security > rate-limit][blocked]',
      )

      return
    }

    return super.report(error, ctx)
  }

  /**
   * An error with status 5xx (or no status, which is 500) that is not an `HTTPException`.
   * `HTTPException` resolves in its own `handle()` and already carries a translated
   * message and `code`; any other arrives here with text that is not ours.
   */
  #isUnexpectedServerFailure(error: unknown): boolean {
    if (error instanceof HTTPException) return false

    if (typeof error === 'object' && error !== null && 'status' in error) {
      return typeof error.status !== 'number' || error.status >= 500
    }

    return true
  }

  #isFieldMessage(value: unknown): value is FieldMessage {
    if (typeof value !== 'object' || value === null) return false
    if (!('field' in value) || !('message' in value)) return false

    return typeof value.field === 'string' && typeof value.message === 'string'
  }

  /**
   * VineJS delivers a list of messages (`{ field, rule, message }`). Here
   * it is flattened into field -> message, the same format the HTTPException's
   * `errors` uses. The first message of each field wins: the screen shows one
   * error per field, and the first is that of the outermost rule.
   */
  #toFieldErrors(messages: unknown): Record<string, string> {
    const errors: Record<string, string> = {}

    if (!Array.isArray(messages)) return errors

    const list: unknown[] = messages

    for (const item of list) {
      if (!this.#isFieldMessage(item)) continue
      if (errors[item.field]) continue

      errors[item.field] = item.message
    }

    return errors
  }
}
