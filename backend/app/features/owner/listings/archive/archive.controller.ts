import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import OwnerListingArchiveUseCase from './archive.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import ListingPolicy from '#policies/listing.policy'
import ListingRepository from '#repositories/listing/listing.repository'

@inject()
export default class OwnerListingArchiveController {
  static docs = defineDocs({
    description:
      'Tira o anúncio do ar: o estado vira `ARCHIVED` e o anúncio vai para a lixeira, na mesma ' +
      'transição, porque a vitrine lê as duas condições e um anúncio arquivado pela metade ' +
      'ainda seria encontrado. Depois disso nenhuma leitura do dono o devolve.\n\n' +
      'Anúncio de outra conta responde o mesmo `404` do que não existe.',
    // Declared by hand because the `404` is born from the `ListingPolicy` besides the use-case.
    errors: { 404: 'LISTING_NOT_FOUND' },
  })

  constructor(
    private readonly listings: ListingRepository,
    private readonly useCase: OwnerListingArchiveUseCase,
  ) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })

    const listing = await this.listings.findById(payload.id)

    await context.bouncer.with(ListingPolicy).authorize('archive', listing)

    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
