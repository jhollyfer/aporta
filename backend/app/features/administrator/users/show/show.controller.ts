import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorUserShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorUserShowController {
  static docs = defineDocs({
    description:
      'Uma conta para o ADMINISTRATOR: nome, e-mail, papel, status e o selo de dono verificado. ' +
      'Nunca traz senha, hash nem sessão.',
    errors: { 404: 'USER_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorUserShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
