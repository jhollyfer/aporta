import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import DocumentationOpenapiShowUseCase from './show.use-case.ts'

/**
 * `GET /openapi.json`. Outside the document itself (`openapi.ignore`): the document
 * does not document itself. Whoever closes the route to those who do not operate the panel is
 * `documentation.middleware`.
 */
@inject()
export default class DocumentationOpenapiShowController {
  constructor(private readonly useCase: DocumentationOpenapiShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute()
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
