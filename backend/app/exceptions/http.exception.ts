import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

import type { ErrorEnvelope } from '#core/response'

/** The message of each field in the `errors` map: already translated, keyed by field name. */
type FieldErrors = Record<string, string>

type HTTPExceptionPayload = ErrorEnvelope

/**
 * A business failure ready to become an HTTP response.
 *
 * The constructor is `protected` on purpose: instances only through the static
 * factories, which are what fix the status/code pair. A loose `new HTTPException(...)`
 * would let any combination through, and the API error catalog would
 * stop being verifiable by reading this file.
 *
 * The factory signature is positional - `(message, code, errors?)` - and the message is
 * always `Translation.t('errors.<CODE>')`: the text lives in
 * `resources/lang/<locale>/errors.json` and comes out in the language of the request
 * (`_standards/i18n.md` §3). The `code` is the contract and is never translated.
 *
 * `handle()` makes this exception resolve itself: AdonisJS calls it when
 * the exception bubbles up from a controller, without passing through the global handler.
 */
export default class HTTPException extends Exception {
  declare code: string
  /** The message of each field, already in the language of the request. */
  errors?: FieldErrors

  protected constructor(payload: HTTPExceptionPayload) {
    super(payload.message, { status: payload.status, code: payload.code })

    if (payload.errors) this.errors = payload.errors
  }

  /**
   * The response body. `errors` only appears when it exists - an error with no per-field
   * detail does not invent an empty key.
   */
  toResponse(): ErrorEnvelope {
    const body: ErrorEnvelope = {
      message: this.message,
      status: this.status,
      code: this.code,
    }

    if (this.errors) {
      body.errors = this.errors
    }

    return body
  }

  handle(error: this, { response }: HttpContext) {
    return response.status(error.status).send(error.toResponse())
  }

  // 4xx - client errors

  /**
   * The 400 that the document generator already described and no factory produced.
   *
   * `scripts/openapi/errors.ts` has had the description of `400` all along, but there
   * was no way to emit it: whoever needed to refuse a payload that cannot even be
   * interpreted fell into 422, which is something else - 422 is "I understood and refuse",
   * 400 is "I could not read it".
   */
  static BadRequest(
    message: string,
    code: string,
    errors?: FieldErrors,
  ): HTTPException {
    return new HTTPException({ status: 400, message, code, errors })
  }

  static Unauthorized(
    message: string,
    code: string,
    errors?: FieldErrors,
  ): HTTPException {
    return new HTTPException({ status: 401, message, code, errors })
  }

  static Forbidden(
    message: string,
    code: string,
    errors?: FieldErrors,
  ): HTTPException {
    return new HTTPException({ status: 403, message, code, errors })
  }

  static NotFound(
    message: string,
    code: string,
    errors?: FieldErrors,
  ): HTTPException {
    return new HTTPException({ status: 404, message, code, errors })
  }

  static Conflict(
    message: string,
    code: string,
    errors?: FieldErrors,
  ): HTTPException {
    return new HTTPException({ status: 409, message, code, errors })
  }

  /** The resource existed and no longer does, which differs from never having existed. */
  static Gone(message: string, code: string): HTTPException {
    return new HTTPException({ status: 410, message, code })
  }

  /** The condition the request declared no longer holds. */
  static PreconditionFailed(
    message: string,
    code: string,
    errors?: FieldErrors,
  ): HTTPException {
    return new HTTPException({ status: 412, message, code, errors })
  }

  /**
   * The body exceeded the ceiling.
   *
   * 413 and not 422: the limit is a transport one, and refusing by size before
   * interpreting is what avoids loading the whole body into memory.
   */
  static PayloadTooLarge(message: string, code: string): HTTPException {
    return new HTTPException({ status: 413, message, code })
  }

  /** The `Content-Type` is not one the route accepts. */
  static UnsupportedMediaType(message: string, code: string): HTTPException {
    return new HTTPException({ status: 415, message, code })
  }

  /** The resource is in use by another operation and does not accept writes now. */
  static Locked(message: string, code: string): HTTPException {
    return new HTTPException({ status: 423, message, code })
  }

  /**
   * The attempt ceiling was exceeded.
   *
   * `@adonisjs/limiter` emits its own exception on throttled routes; this one
   * exists for the ceiling that is a business rule and not a transport one.
   */
  static TooManyRequests(message: string, code: string): HTTPException {
    return new HTTPException({ status: 429, message, code })
  }

  static UnprocessableEntity(
    message: string,
    code: string,
    errors?: FieldErrors,
  ): HTTPException {
    return new HTTPException({ status: 422, message, code, errors })
  }

  // 5xx - server errors

  static InternalServerError(message: string, code: string): HTTPException {
    return new HTTPException({ status: 500, message, code })
  }

  static ServiceUnavailable(message: string, code: string): HTTPException {
    return new HTTPException({ status: 503, message, code })
  }
  /** The route exists and the path has not been built yet. */
  static NotImplemented(message: string, code: string): HTTPException {
    return new HTTPException({ status: 501, message, code })
  }

  /** The third party answered, and answered wrong. */
  static BadGateway(message: string, code: string): HTTPException {
    return new HTTPException({ status: 502, message, code })
  }

  /** The third party did not answer in time. */
  static GatewayTimeout(message: string, code: string): HTTPException {
    return new HTTPException({ status: 504, message, code })
  }
}
