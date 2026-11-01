import string from '@adonisjs/core/helpers/string'

import type { OpenAPIResponse, SchemaObject } from '#core/openapi/types'

/**
 * The failure responses.
 *
 * The API has a single error body - `ErrorEnvelope`, in
 * `app/exceptions/http.exception.ts` - and it is what comes out of here. What varies between
 * one failure and another is the `code`, and it is precisely the `code` that the client uses to
 * decide what to do. That is why each status becomes a schema with the `code`
 * restricted by `enum` to the values that operation really returns: the failure
 * list becomes exhaustive instead of decorative.
 *
 * When the operation declares no code for a status, the `code` comes out as a free
 * string. An empty enum would be a lie, and an invented enum would be worse.
 */

const DESCRIPTIONS: Readonly<Record<number, string>> = {
  400: 'Requisição inválida',
  401: 'Não autenticado',
  403: 'Acesso negado',
  404: 'Recurso não encontrado',
  409: 'Conflito com o estado atual',
  422: 'Payload recusado pela validação',
  429: 'Tentativas em excesso',
  500: 'Erro interno do servidor',
}

/**
 * The per-field `errors` only exists on validation failure and on uniqueness
 * conflict. Declaring it required where it does not come would make the client treat
 * absence as an error.
 */
const REQUIRES_FIELD_ERRORS = 422

/**
 * Name of the component that describes a failure.
 *
 * The error body is always the same; what changes is the `enum` of the `code`. Naming by
 * status plus the codes makes operations that fail the same way share a
 * single component - the document shrinks, and whoever generates a typed client gets a type
 * named per failure instead of an anonymous object repeated on each endpoint.
 */
export function errorComponentName(status: number, codes: string[]): string {
  const suffix = [...codes]
    .sort()
    .map((code) => string.pascalCase(code.toLowerCase()))
    .join('')

  return `Error${status}${suffix}`
}

export function errorSchema(status: number, codes: string[]): SchemaObject {
  const code: SchemaObject = {
    type: 'string',
    description: 'Identificador de máquina da falha.',
  }

  if (codes.length > 0) {
    code.enum = [...codes].sort()
  }

  const required = ['message', 'status', 'code']

  if (status === REQUIRES_FIELD_ERRORS) required.push('errors')

  return {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Mensagem em português, exibível ao usuário.',
      },
      status: { type: 'integer', enum: [status] },
      code,
      errors: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description:
          'Mensagem por campo, quando a falha é atribuível a campos do payload.',
      },
    },
    required,
  }
}

export function errorResponse(
  status: number,
  reference: string,
  description?: string,
): OpenAPIResponse {
  return {
    description: description ?? DESCRIPTIONS[status] ?? 'Falha',
    content: { 'application/json': { schema: { $ref: reference } } },
  }
}

// ---------------------------------------------------------------------------
// Automatic failures
// ---------------------------------------------------------------------------

/**
 * Codes that come from no use-case: they are produced by the middleware or by the
 * global handler, and that is why they hold for every route that goes through them. No
 * controller needs to declare them.
 */
export const AUTOMATIC_CODES = {
  /** `HttpExceptionHandler` translates the guard's `E_UNAUTHORIZED_ACCESS`. */
  unauthenticated: 'UNAUTHORIZED',
  /** `role.middleware.ts` refuses the role. */
  forbidden: 'ACCESS_DENIED',
  /** `HttpExceptionHandler` translates VineJS's `E_VALIDATION_ERROR`. */
  validation: 'VALIDATION_ERROR',
  /** `HttpExceptionHandler` translates the limiter's `E_TOO_MANY_REQUESTS`. */
  tooManyRequests: 'TOO_MANY_REQUESTS',
  /** `HttpExceptionHandler` answers this to every 5xx that is not an `HTTPException`. */
  serverError: 'SERVER_ERROR',
} as const

export function forbiddenDescription(roles: string[]): string {
  const forbidden = DESCRIPTIONS[403] ?? 'Acesso negado'

  if (roles.length === 0) return forbidden

  return `${forbidden}. Exige um destes papéis: ${roles.join(', ')}.`
}
