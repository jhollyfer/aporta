import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { LISTING_SORT_COLUMNS } from '@aporta/shared'

import OwnerListingPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { OwnerListingPaginateValidator } from '#validators/owner/listings.validator'

@inject()
export default class OwnerListingPaginateController {
  static docs = defineDocs({
    description:
      'Os anúncios do dono autenticado, em qualquer estado fora a lixeira: o que está no ar, o ' +
      'que espera revisão e o que ainda é rascunho. O recorte por conta é a sessão, dentro da ' +
      'consulta, e não há parâmetro de dono para forjar: anúncio de outra conta não aparece, nem ' +
      'na contagem.\n\n' +
      '`?status` recorta por estado e `?search` filtra por título e descrição.\n\n' +
      // The list comes from the tuple itself: written by hand, the documentation would start
      // promising a column the day someone removed it from the validator.
      `\`?sort\` aceita ${LISTING_SORT_COLUMNS.join(', ')} e \`?direction\` aceita asc ou desc. ` +
      'Padrão: página 1, 20 por página, do mais recente para o mais antigo.',
  })

  constructor(private readonly useCase: OwnerListingPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      OwnerListingPaginateValidator,
    )
    const result = await this.useCase.execute({
      ...payload,
      actor: context.actor,
    })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
