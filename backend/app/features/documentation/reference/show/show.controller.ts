import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import DocumentationReferenceShowUseCase from './show.use-case.ts'

/**
 * `GET /documentation`. Outside the document itself (`openapi.ignore`), and closed
 * by `documentation.middleware` like `/openapi.json`.
 */
@inject()
export default class DocumentationReferenceShowController {
  /**
   * The CSP of the reference page. No `default-src`: the Scalar bundle comes from the
   * CDN, runs an inline `<script>` and loads style and font on its own,
   * so a resource policy would break the page. Only directives that
   * load no resource and hold for any HTML go in: no framing, no changing
   * the base, no opening `<object>` or posting forms. The other API responses
   * carry the strict policy from `config/shield.ts`.
   */
  private static readonly CONTENT_SECURITY_POLICY = [
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'none'",
  ].join('; ')

  constructor(private readonly useCase: DocumentationReferenceShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute()
    if (result.isLeft()) throw result.value
    return context.response
      .header('content-type', 'text/html')
      .header(
        'content-security-policy',
        DocumentationReferenceShowController.CONTENT_SECURITY_POLICY,
      )
      .send(result.value)
  }
}
