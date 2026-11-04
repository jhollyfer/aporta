import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { USER_SORT_COLUMNS } from '@aporta/shared'

import AdministratorUserPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorUserPaginateValidator } from '#validators/administrator/users.validator'

@inject()
export default class AdministratorUserPaginateController {
  static docs = defineDocs({
    description:
      'As contas da plataforma para o ADMINISTRATOR: quem é, que papel tem e se pode entrar. Só ' +
      'o administrador lê esta lista; moderador e dono recebem `403`.\n\n' +
      '`?role` filtra pelo papel (`ADMINISTRATOR`, `MODERATOR` ou `OWNER`), `?status` por ' +
      '`ACTIVE` ou `INACTIVE` (conta suspensa) e `?search` procura no nome e no e-mail. ' +
      `\`?sort\` aceita ${USER_SORT_COLUMNS.join(', ')} e \`?direction\` aceita asc ou desc; ` +
      'sem ordem, vêm as contas mais novas primeiro. A resposta nunca traz senha, hash nem sessão.',
  })

  constructor(private readonly useCase: AdministratorUserPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      AdministratorUserPaginateValidator,
    )
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
