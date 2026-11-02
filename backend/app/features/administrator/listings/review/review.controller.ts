import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorListingReviewUseCase from './review.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import { AdministratorListingReviewValidator } from '#validators/administrator/listings.validator'

@inject()
export default class AdministratorListingReviewController {
  static docs = defineDocs({
    description:
      'A decisão da equipe sobre um anúncio que espera na fila (`PENDING`).\n\n' +
      '`APPROVE` publica: o estado vira `PUBLISHED` e o anúncio passa a aparecer na vitrine. ' +
      '`REFUSE` devolve ao dono com o motivo em `note`, **obrigatório** (de 3 a 500 caracteres): ' +
      'o anúncio volta a `DRAFT` e o dono lê o motivo em `review.note`. Quando o dono edita o ' +
      'anúncio devolvido, ele volta sozinho para a fila.\n\n' +
      'Só anúncio em `PENDING` é decidido: qualquer outro estado responde `409`. Quem decidiu e ' +
      'quando ficam gravados.',
    errors: { 404: 'LISTING_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorListingReviewUseCase) {}

  async handle(context: HttpContext) {
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const payload = await context.request.validateUsing(
      AdministratorListingReviewValidator,
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
