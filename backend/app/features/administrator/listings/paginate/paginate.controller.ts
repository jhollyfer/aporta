import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { LISTING_SORT_COLUMNS } from '@aporta/shared'

import AdministratorListingPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorListingPaginateValidator } from '#validators/administrator/listings.validator'

@inject()
export default class AdministratorListingPaginateController {
  static docs = defineDocs({
    description:
      'Os anúncios de toda a plataforma para a equipe, em qualquer estado, **inclusive os ' +
      'arquivados** (que estão na lixeira por definição). Cada item traz a conta do dono e as ' +
      'fotos com URL assinada.\n\n' +
      '`?status` recorta por estado e `?search` filtra por título e descrição. Com ' +
      '`?status=PENDING` a fila vem do mais antigo para o mais novo, para ninguém esperar atrás ' +
      'de quem chegou depois; nos demais recortes, do mais recente para o mais antigo.\n\n' +
      `\`?sort\` aceita ${LISTING_SORT_COLUMNS.join(', ')} e \`?direction\` aceita asc ou desc, ` +
      'e valem sobre o padrão. Padrão: página 1, 20 por página.',
  })

  constructor(private readonly useCase: AdministratorListingPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      AdministratorListingPaginateValidator,
    )
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
