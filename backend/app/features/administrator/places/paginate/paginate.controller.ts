import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { PLACE_SORT_COLUMNS } from '@aporta/shared'

import AdministratorPlacePaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorPlacePaginateValidator } from '#validators/administrator/places.validator'

@inject()
export default class AdministratorPlacePaginateController {
  static docs = defineDocs({
    description:
      'O guia da cidade para a equipe: os lugares de comer, beber, eventos e serviços, com o filtro ' +
      '`?category` (EAT, DRINK, EVENT, SERVICE) e `?search` por nome e descrição.\n\n' +
      'Sem `?trashed` vêm só os lugares no ar; `?trashed=only` mostra só os arquivados (a tela de ' +
      'restaurar) e `?trashed=with` os dois juntos. Cada item traz `archivedAt`.\n\n' +
      `\`?sort\` aceita ${PLACE_SORT_COLUMNS.join(', ')} e \`?direction\` aceita asc ou desc. ` +
      'Padrão: por nome, página 1, 20 por página.',
  })

  constructor(private readonly useCase: AdministratorPlacePaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      AdministratorPlacePaginateValidator,
    )
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
