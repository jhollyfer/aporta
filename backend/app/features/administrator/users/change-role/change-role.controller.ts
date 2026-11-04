import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorUserChangeRoleUseCase from './change-role.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import { AdministratorUserChangeRoleValidator } from '#validators/administrator/users.validator'

@inject()
export default class AdministratorUserChangeRoleController {
  static docs = defineDocs({
    description:
      'Muda o papel da conta (`OWNER`, `MODERATOR` ou `ADMINISTRATOR`). Só o ADMINISTRATOR faz ' +
      'isso; moderador e dono recebem `403`. As sessões abertas da conta caem: a pessoa entra de ' +
      'novo já com o papel novo. Pedir o papel que a conta já tem não muda nada.\n\n' +
      'Recusas (`409`): a própria conta do administrador (`USER_OWN_ACCESS_CHANGE`), dono que ainda ' +
      'tem anúncio fora da lixeira (`USER_OWNS_LISTINGS`, porque a equipe não tem anúncios próprios) ' +
      'e o último administrador ativo (`USER_LAST_ADMINISTRATOR`).',
    errors: {
      404: 'USER_NOT_FOUND',
      409: [
        'USER_OWN_ACCESS_CHANGE',
        'USER_OWNS_LISTINGS',
        'USER_LAST_ADMINISTRATOR',
      ],
    },
  })

  constructor(private readonly useCase: AdministratorUserChangeRoleUseCase) {}

  async handle(context: HttpContext) {
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const payload = await context.request.validateUsing(
      AdministratorUserChangeRoleValidator,
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
