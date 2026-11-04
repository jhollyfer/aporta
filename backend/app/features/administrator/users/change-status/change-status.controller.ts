import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorUserChangeStatusUseCase from './change-status.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import { AdministratorUserChangeStatusValidator } from '#validators/administrator/users.validator'

@inject()
export default class AdministratorUserChangeStatusController {
  static docs = defineDocs({
    description:
      'Suspende (`status: INACTIVE`) ou reativa (`status: ACTIVE`) a conta. Só o ADMINISTRATOR faz ' +
      'isso; moderador e dono recebem `403`. A conta suspensa não entra (o login responde o mesmo ' +
      '`401` de senha errada), não renova o token e perde as sessões abertas na hora. Os anúncios ' +
      'da conta não mudam. Reativar devolve o direito de entrar, mas não as sessões que caíram.\n\n' +
      'Recusas (`409`): a própria conta do administrador (`USER_OWN_ACCESS_CHANGE`) e o último ' +
      'administrador ativo (`USER_LAST_ADMINISTRATOR`).',
    errors: {
      404: 'USER_NOT_FOUND',
      409: ['USER_OWN_ACCESS_CHANGE', 'USER_LAST_ADMINISTRATOR'],
    },
  })

  constructor(private readonly useCase: AdministratorUserChangeStatusUseCase) {}

  async handle(context: HttpContext) {
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const payload = await context.request.validateUsing(
      AdministratorUserChangeStatusValidator,
    )
    const result = await this.useCase.execute({
      ...payload,
      ...params,
      actor: context.actor,
    })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
